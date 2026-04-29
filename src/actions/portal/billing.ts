"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession } from "@/actions/auth/staff";
import { z } from "zod";

type BillingResult =
  | {
      success: true;
      referenceNo: string;
      pointsEarned: number;
      subtotal: number;
      discountTotal: number;
      taxTotal: number;
      grandTotal: number;
    }
  | { success: false; error: string };

const lineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable().optional(),
  quantity: z.coerce.number().int().min(1),
  discountType: z.enum(["NONE", "FIXED", "PERCENT"]).default("NONE"),
  discountValue: z.coerce.number().min(0).default(0),
});

const saleSchema = z.object({
  siteId: z.string().min(1),
  customerPhone: z.string().trim().min(5, "Phone number is required"),
  customerName: z.string().trim().optional(),
  rewardId: z.string().trim().optional(),
  items: z.array(lineSchema).min(1, "Add at least one item"),
});

async function resolveIdentity(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) {
    return {
      masterProfileId: masterResult.masterProfile.id,
      actorId: masterResult.masterProfile.id,
      masterUserId: masterResult.masterProfile.userId,
      subUserId: null,
    };
  }

  const staffSession = await getStaffSession().catch(() => null);
  if (!staffSession) throw new Error("Unauthorized");

  const subUserSite = await prisma.subUserSite.findUnique({
    where: { subUserId_siteId: { subUserId: staffSession.subUserId, siteId } },
    include: { site: true, permissions: { include: { module: true, page: true } } },
  });
  if (!subUserSite?.site.isActive) throw new Error("Unauthorized");

  const canBill = subUserSite.permissions.some(
    (permission) =>
      (permission.module?.key === "billing" && !permission.page) ||
      permission.page?.key === "billing.pos"
  );
  if (!canBill) throw new Error("You do not have billing permission");

  return {
    masterProfileId: staffSession.masterProfileId,
    actorId: staffSession.subUserId,
    masterUserId: null,
    subUserId: staffSession.subUserId,
  };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function completePosSaleAction(input: unknown): Promise<BillingResult> {
  try {
    const parsed = saleSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const { siteId, customerPhone, customerName, rewardId, items } = parsed.data;
    const identity = await resolveIdentity(siteId);

    const [site, program, products] = await Promise.all([
      prisma.site.findFirst({
        where: { id: siteId, masterProfileId: identity.masterProfileId, isActive: true },
      }),
      prisma.loyaltyProgram.findUnique({
        where: { masterProfileId: identity.masterProfileId },
        include: {
          siteOverrides: { where: { siteId } },
          earnRules: { where: { deletedAt: null, isActive: true, OR: [{ siteId: null }, { siteId }] } },
        },
      }),
      prisma.product.findMany({
        where: {
          id: { in: [...new Set(items.map((item) => item.productId))] },
          masterProfileId: identity.masterProfileId,
          deletedAt: null,
          isActive: true,
          OR: [{ siteId }, { siteId: null }, { isGlobal: true }],
        },
        include: {
          variants: { where: { deletedAt: null, isActive: true } },
          category: { select: { id: true } },
          taxGroup: { select: { rate: true } },
        },
      }),
    ]);

    if (!site) return { success: false, error: "Site not found" };
    if (products.length !== new Set(items.map((item) => item.productId)).size) {
      return { success: false, error: "One or more products are not available at this site" };
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const referenceNo = `BILL-${Date.now().toString(36).toUpperCase()}`;

    const saleLines = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const variant = item.variantId
        ? product.variants.find((candidate) => candidate.id === item.variantId)
        : null;

      if (item.variantId && !variant) throw new Error(`${product.name} variant not found`);

      const availableStock = variant ? variant.stock : product.stock;
      if (availableStock < item.quantity) throw new Error(`${product.name} has only ${availableStock} in stock`);

      const unitPrice = variant?.sellingPrice ?? product.sellingPrice ?? 0;
      if (unitPrice <= 0) throw new Error(`${product.name} needs a selling price before billing`);

      const rawDiscount = item.discountType === "PERCENT"
        ? unitPrice * Math.min(item.discountValue, 100) / 100
        : item.discountType === "FIXED"
          ? item.discountValue
          : 0;
      const unitDiscount = roundMoney(Math.min(unitPrice, rawDiscount));
      const taxableUnitPrice = roundMoney(unitPrice - unitDiscount);
      const taxRate = product.taxGroup?.rate ?? 0;
      const lineSubtotal = roundMoney(unitPrice * item.quantity);
      const lineDiscount = roundMoney(unitDiscount * item.quantity);
      const taxableAmount = roundMoney(taxableUnitPrice * item.quantity);
      const taxAmount = roundMoney(taxableAmount * taxRate / 100);
      const lineTotal = roundMoney(taxableAmount + taxAmount);

      return {
        product,
        variant,
        quantity: item.quantity,
        unitPrice,
        unitDiscount,
        discountType: item.discountType,
        discountValue: item.discountValue,
        taxRate,
        lineSubtotal,
        lineDiscount,
        taxableAmount,
        taxAmount,
        lineTotal,
      };
    });

    const subtotal = roundMoney(saleLines.reduce((sum, line) => sum + line.lineSubtotal, 0));
    const discountTotal = roundMoney(saleLines.reduce((sum, line) => sum + line.lineDiscount, 0));
    const taxableTotal = roundMoney(saleLines.reduce((sum, line) => sum + line.taxableAmount, 0));
    const taxTotal = roundMoney(saleLines.reduce((sum, line) => sum + line.taxAmount, 0));
    const grandTotal = roundMoney(taxableTotal + taxTotal);

    const customer = await prisma.customer.upsert({
      where: { masterProfileId_phone: { masterProfileId: identity.masterProfileId, phone: customerPhone } },
      update: {
        name: customerName || undefined,
        isActive: true,
        deletedAt: null,
      },
      create: {
        masterProfileId: identity.masterProfileId,
        phone: customerPhone,
        name: customerName || customerPhone,
        loyalty: { create: { currentPoints: 0, lifetimePoints: 0, lifetimeSpend: 0 } },
      },
      include: { loyalty: true },
    });

    const siteOverride = program?.siteOverrides[0];
    const loyaltyEnabled = !!program?.isEnabled && siteOverride?.isEnabled !== false;
    const rate = siteOverride?.pointsPerUnit ?? program?.pointsPerUnit ?? 1;
    const unitValue = siteOverride?.unitValue ?? program?.unitValue ?? 1;
    const basePoints = loyaltyEnabled ? Math.floor((taxableTotal / unitValue) * rate) : 0;
    let bonusPoints = 0;

    if (loyaltyEnabled && program) {
      for (const line of saleLines) {
        for (const rule of program.earnRules) {
          const matchesProduct = rule.productId === line.product.id;
          const matchesCategory = !!rule.categoryId && rule.categoryId === line.product.categoryId;
          if (!matchesProduct && !matchesCategory) continue;

          const lineBasePoints = Math.floor((line.taxableAmount / unitValue) * rate);
          bonusPoints += rule.bonusType === "MULTIPLIER"
            ? Math.floor(lineBasePoints * (rule.bonusValue - 1))
            : Math.floor(rule.bonusValue * line.quantity);
        }
      }
    }

    const pointsEarned = Math.max(0, basePoints + bonusPoints);

    await prisma.$transaction(async (tx) => {
      for (const line of saleLines) {
        let quantityAfter: number;

        if (line.variant) {
          const updated = await tx.productVariant.updateMany({
            where: { id: line.variant.id, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (updated.count !== 1) throw new Error(`${line.product.name} does not have enough stock`);

          const refreshed = await tx.productVariant.findUnique({
            where: { id: line.variant.id },
            select: { stock: true },
          });
          quantityAfter = refreshed?.stock ?? 0;
        } else {
          const updated = await tx.product.updateMany({
            where: { id: line.product.id, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (updated.count !== 1) throw new Error(`${line.product.name} does not have enough stock`);

          const refreshed = await tx.product.findUnique({
            where: { id: line.product.id },
            select: { stock: true },
          });
          quantityAfter = refreshed?.stock ?? 0;
        }

        const quantityBefore = quantityAfter + line.quantity;

        await tx.stockMovement.create({
          data: {
            type: "SALE",
            quantity: -line.quantity,
            quantityBefore,
            quantityAfter,
            note: `${referenceNo} | unit ${line.unitPrice} | discount ${line.lineDiscount}`,
            productId: line.product.id,
            variantId: line.variant?.id ?? null,
            siteId,
            masterProfileId: identity.masterProfileId,
            orderId: referenceNo,
            createdBy: identity.actorId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          siteId,
          masterUserId: identity.masterUserId,
          subUserId: identity.subUserId,
          action: "POS_BILL_CREATED",
          module: "billing",
          recordId: referenceNo,
          recordType: "Billing",
          metadata: {
            referenceNo,
            customerId: customer.id,
            customerPhone,
            customerName: customer.name,
            subtotal,
            discountTotal,
            taxTotal,
            grandTotal,
            rewardId: rewardId || null,
            lines: saleLines.map((line) => ({
              productId: line.product.id,
              variantId: line.variant?.id ?? null,
              name: line.product.name,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              unitDiscount: line.unitDiscount,
              taxRate: line.taxRate,
              lineTotal: line.lineTotal,
            })),
          },
        },
      });

      if (pointsEarned > 0) {
        const loyalty = await tx.customerLoyalty.upsert({
          where: { customerId: customer.id },
          update: {},
          create: { customerId: customer.id, currentPoints: 0, lifetimePoints: 0, lifetimeSpend: 0 },
        });

        await tx.customerLoyalty.update({
          where: { customerId: customer.id },
          data: {
            currentPoints: { increment: pointsEarned },
            lifetimePoints: { increment: pointsEarned },
            lifetimeSpend: { increment: taxableTotal },
          },
        });

        await tx.loyaltyTransaction.create({
          data: {
            type: "EARN",
            points: pointsEarned,
            balanceBefore: loyalty.currentPoints,
            balanceAfter: loyalty.currentPoints + pointsEarned,
            note: `Earned from ${referenceNo}`,
            customerId: customer.id,
            siteId,
            masterProfileId: identity.masterProfileId,
            orderId: referenceNo,
            createdBy: identity.actorId,
          },
        });
      }

      if (rewardId) {
        const reward = await tx.loyaltyReward.findFirst({
          where: {
            id: rewardId,
            masterProfileId: identity.masterProfileId,
            deletedAt: null,
            isActive: true,
            OR: [{ isGlobal: true }, { siteId }],
          },
        });
        const loyalty = await tx.customerLoyalty.findUnique({ where: { customerId: customer.id } });
        if (!reward || !loyalty || loyalty.currentPoints < reward.pointsCost) {
          throw new Error("Selected reward cannot be redeemed");
        }
        if (reward.maxRedemptions != null && reward.redemptionCount >= reward.maxRedemptions) {
          throw new Error("Selected reward has reached its redemption limit");
        }
        if (reward.expiresAt && reward.expiresAt < new Date()) {
          throw new Error("Selected reward has expired");
        }

        await tx.customerLoyalty.update({
          where: { customerId: customer.id },
          data: { currentPoints: { decrement: reward.pointsCost } },
        });
        await tx.loyaltyReward.update({
          where: { id: reward.id },
          data: { redemptionCount: { increment: 1 } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            type: "REDEEM",
            points: -reward.pointsCost,
            balanceBefore: loyalty.currentPoints,
            balanceAfter: loyalty.currentPoints - reward.pointsCost,
            note: `Redeemed ${reward.name} on ${referenceNo}`,
            customerId: customer.id,
            rewardId: reward.id,
            siteId,
            masterProfileId: identity.masterProfileId,
            orderId: referenceNo,
            createdBy: identity.actorId,
          },
        });
      }
    });

    revalidatePath(`/portal/${siteId}/billing/pos`);
    revalidatePath(`/portal/${siteId}/inventory/stock`);
    revalidatePath(`/portal/${siteId}/loyalty/customers`);
    revalidatePath(`/portal/${siteId}/customers/loyalty`);

    return { success: true, referenceNo, pointsEarned, subtotal, discountTotal, taxTotal, grandTotal };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to complete bill" };
  }
}
