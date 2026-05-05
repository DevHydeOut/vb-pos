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
      rewardDiscountTotal: number;
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
      masterUserId: masterResult.session.user.id,
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

function allocateDiscount(total: number, weights: number[]) {
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  let remaining = total;

  return weights.map((weight, index) => {
    if (total <= 0 || weightTotal <= 0) return 0;
    if (index === weights.length - 1) return roundMoney(Math.min(weight, remaining));

    const share = roundMoney(total * (weight / weightTotal));
    const value = roundMoney(Math.min(weight, share, remaining));
    remaining = roundMoney(remaining - value);
    return value;
  });
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

    const baseLines = items.map((item) => {
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

      return {
        product,
        variant,
        quantity: item.quantity,
        unitPrice,
        unitDiscount,
        discountType: item.discountType,
        discountValue: item.discountValue,
        taxRate: product.taxGroup?.rate ?? 0,
        lineSubtotal: roundMoney(unitPrice * item.quantity),
        lineDiscount: roundMoney(unitDiscount * item.quantity),
        taxableBeforeReward: roundMoney(taxableUnitPrice * item.quantity),
      };
    });

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

    const reward = rewardId
      ? await prisma.loyaltyReward.findFirst({
          where: {
            id: rewardId,
            masterProfileId: identity.masterProfileId,
            deletedAt: null,
            isActive: true,
            OR: [{ isGlobal: true }, { siteId }],
          },
        })
      : null;

    if (rewardId && !reward) return { success: false, error: "Selected reward is not available at this site" };
    if (reward?.expiresAt && reward.expiresAt < new Date()) return { success: false, error: "Selected reward has expired" };
    if (reward?.maxRedemptions != null && reward.redemptionCount >= reward.maxRedemptions) {
      return { success: false, error: "Selected reward has reached its redemption limit" };
    }
    if (reward && (customer.loyalty?.currentPoints ?? 0) < reward.pointsCost) {
      return { success: false, error: "Customer does not have enough royalty points for this reward" };
    }

    const subtotal = roundMoney(baseLines.reduce((sum, line) => sum + line.lineSubtotal, 0));
    const discountTotal = roundMoney(baseLines.reduce((sum, line) => sum + line.lineDiscount, 0));
    const taxableBeforeReward = roundMoney(baseLines.reduce((sum, line) => sum + line.taxableBeforeReward, 0));

    let rewardDiscountTotal = 0;
    let rewardDiscounts = baseLines.map(() => 0);

    if (reward) {
      if (reward.type === "FIXED_DISCOUNT") {
        rewardDiscountTotal = roundMoney(Math.min(taxableBeforeReward, reward.discountValue ?? 0));
        rewardDiscounts = allocateDiscount(
          rewardDiscountTotal,
          baseLines.map((line) => line.taxableBeforeReward)
        );
      } else if (reward.type === "PERCENT_DISCOUNT") {
        const percent = Math.min(Math.max(reward.discountValue ?? 0, 0), 100);
        rewardDiscountTotal = roundMoney(taxableBeforeReward * percent / 100);
        rewardDiscounts = allocateDiscount(
          rewardDiscountTotal,
          baseLines.map((line) => line.taxableBeforeReward)
        );
      } else if (reward.type === "FREE_PRODUCT") {
        const lineIndex = baseLines.findIndex((line) => line.product.id === reward.productId);
        if (lineIndex === -1) {
          return { success: false, error: "Add the reward product to the cart before claiming this reward" };
        }

        const line = baseLines[lineIndex];
        rewardDiscountTotal = roundMoney(Math.min(line.unitPrice - line.unitDiscount, line.taxableBeforeReward));
        rewardDiscounts[lineIndex] = rewardDiscountTotal;
      }
    }

    const saleLines = baseLines.map((line, index) => {
      const rewardDiscount = roundMoney(Math.min(line.taxableBeforeReward, rewardDiscounts[index] ?? 0));
      const taxableAmount = roundMoney(line.taxableBeforeReward - rewardDiscount);
      const taxAmount = roundMoney(taxableAmount * line.taxRate / 100);

      return {
        ...line,
        rewardDiscount,
        taxableAmount,
        taxAmount,
        lineTotal: roundMoney(taxableAmount + taxAmount),
      };
    });

    rewardDiscountTotal = roundMoney(saleLines.reduce((sum, line) => sum + line.rewardDiscount, 0));
    const taxableTotal = roundMoney(saleLines.reduce((sum, line) => sum + line.taxableAmount, 0));
    const taxTotal = roundMoney(saleLines.reduce((sum, line) => sum + line.taxAmount, 0));
    const grandTotal = roundMoney(taxableTotal + taxTotal);

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
      const order = await tx.saleOrder.create({
        data: {
          referenceNo,
          customerId: customer.id,
          siteId,
          masterProfileId: identity.masterProfileId,
          subtotal,
          itemDiscountTotal: discountTotal,
          rewardDiscountTotal,
          taxTotal,
          grandTotal,
          pointsEarned,
          rewardId: reward?.id ?? null,
          rewardName: reward?.name ?? null,
          rewardType: reward?.type ?? null,
          createdBy: identity.actorId,
          items: {
            create: saleLines.map((line) => ({
              productId: line.product.id,
              variantId: line.variant?.id ?? null,
              productName: line.product.name,
              variantName: line.variant?.name ?? null,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountType: line.discountType,
              discountValue: line.discountValue,
              itemDiscount: line.lineDiscount,
              rewardDiscount: line.rewardDiscount,
              taxRate: line.taxRate,
              taxAmount: line.taxAmount,
              lineTotal: line.lineTotal,
            })),
          },
        },
      });

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
            note: `${referenceNo} | unit ${line.unitPrice} | item discount ${line.lineDiscount} | reward discount ${line.rewardDiscount}`,
            productId: line.product.id,
            variantId: line.variant?.id ?? null,
            siteId,
            masterProfileId: identity.masterProfileId,
            orderId: order.id,
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
          recordId: order.id,
          recordType: "SaleOrder",
          metadata: {
            referenceNo,
            customerId: customer.id,
            customerPhone,
            customerName: customer.name,
            subtotal,
            discountTotal,
            rewardDiscountTotal,
            taxTotal,
            grandTotal,
            rewardId: reward?.id ?? null,
            lines: saleLines.map((line) => ({
              productId: line.product.id,
              variantId: line.variant?.id ?? null,
              name: line.product.name,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              unitDiscount: line.unitDiscount,
              rewardDiscount: line.rewardDiscount,
              taxRate: line.taxRate,
              lineTotal: line.lineTotal,
            })),
          },
        },
      });

      const loyalty = await tx.customerLoyalty.upsert({
        where: { customerId: customer.id },
        update: {},
        create: { customerId: customer.id, currentPoints: 0, lifetimePoints: 0, lifetimeSpend: 0 },
      });

      let currentBalance = loyalty.currentPoints;

      if (reward) {
        if (currentBalance < reward.pointsCost) throw new Error("Customer does not have enough royalty points for this reward");

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
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - reward.pointsCost,
            note: `Redeemed ${reward.name} on ${referenceNo}`,
            customerId: customer.id,
            rewardId: reward.id,
            siteId,
            masterProfileId: identity.masterProfileId,
            orderId: order.id,
            createdBy: identity.actorId,
          },
        });
        currentBalance -= reward.pointsCost;
      }

      await tx.customerLoyalty.update({
        where: { customerId: customer.id },
        data: {
          currentPoints: { increment: pointsEarned },
          lifetimePoints: { increment: pointsEarned },
          lifetimeSpend: { increment: taxableTotal },
        },
      });

      if (pointsEarned > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            type: "EARN",
            points: pointsEarned,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance + pointsEarned,
            note: `Earned from ${referenceNo}`,
            customerId: customer.id,
            siteId,
            masterProfileId: identity.masterProfileId,
            orderId: order.id,
            createdBy: identity.actorId,
          },
        });
      }
    });

    revalidatePath(`/portal/${siteId}/billing/pos`);
    revalidatePath(`/portal/${siteId}/inventory/stock`);
    revalidatePath(`/portal/${siteId}/loyalty/customers`);

    return {
      success: true,
      referenceNo,
      pointsEarned,
      subtotal,
      discountTotal,
      rewardDiscountTotal,
      taxTotal,
      grandTotal,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to complete bill" };
  }
}
