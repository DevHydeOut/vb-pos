"use server";

// src/actions/portal/stock.ts

import { revalidatePath }   from "next/cache";
import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { z }                from "zod";

/* ── Types ───────────────────────────────────────────────────── */

type ActionResult =
  | { success: true }
  | { success: false; error: string };

/* ── Helpers ─────────────────────────────────────────────────── */

async function resolveIdentity(siteId: string | null) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) return { masterProfileId: masterResult.masterProfile.id, isMaster: true };

  const staffSession = await getStaffSession().catch(() => null);
  if (staffSession && siteId) {
    const site = await prisma.site.findFirst({ where: { id: siteId } });
    if (!site) throw new Error("Site not found");
    return { masterProfileId: site.masterProfileId, isMaster: false };
  }
  throw new Error("Unauthorized");
}

function revalidateStock(siteId: string | null, productId?: string) {
  if (siteId) {
    revalidatePath(`/portal/${siteId}/inventory/stock`);
    revalidatePath(`/portal/${siteId}/inventory/stock`);
    if (productId) {
      revalidatePath(`/portal/${siteId}/inventory/products/${productId}`);
    }
  }
  revalidatePath("/dashboard/manage/products");
}

/* ── Validation ──────────────────────────────────────────────── */

const adjustmentSchema = z.object({
  productId:  z.string().min(1, "Product is required"),
  variantId:  z.string().optional().nullable(),
  type:       z.enum(["ADJUSTMENT", "DAMAGE", "OPENING", "PURCHASE"]),
  quantity:   z.coerce.number().int().refine((n) => n !== 0, "Quantity cannot be zero"),
  note:       z.string().optional(),
});

/* ═══════════════════════════════════════════════════════════════
   STOCK ADJUSTMENT
   Manual correction — can add or remove stock with a reason
═══════════════════════════════════════════════════════════════ */

export async function createStockAdjustmentAction(
  siteId: string | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const identity   = await resolveIdentity(siteId);
    const parsed     = adjustmentSchema.safeParse({
      productId: formData.get("productId"),
      variantId: formData.get("variantId") || null,
      type:      formData.get("type"),
      quantity:  formData.get("quantity"),
      note:      formData.get("note") || undefined,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const { productId, variantId, type, quantity, note } = parsed.data;

    // Verify product belongs to this master
    const product = await prisma.product.findFirst({
      where: { id: productId, masterProfileId: identity.masterProfileId, deletedAt: null },
    });
    if (!product) return { success: false, error: "Product not found" };

    // Get current stock
    let quantityBefore: number;
    if (variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: variantId, productId, deletedAt: null },
      });
      if (!variant) return { success: false, error: "Variant not found" };
      quantityBefore = variant.stock;
    } else {
      quantityBefore = product.stock;
    }

    const quantityAfter = Math.max(0, quantityBefore + quantity);

    // Use interactive transaction — avoids union type inference issue
    // with spread arrays of different Prisma client types
    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          type,
          quantity,
          quantityBefore,
          quantityAfter,
          note,
          productId,
          variantId:       variantId ?? null,
          siteId,
          masterProfileId: identity.masterProfileId,
        },
      });

      if (variantId) {
        await tx.productVariant.update({
          where: { id: variantId },
          data:  { stock: quantityAfter },
        });
      } else {
        await tx.product.update({
          where: { id: productId },
          data:  { stock: quantityAfter },
        });
      }
    });

    revalidateStock(siteId, productId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save stock adjustment" };
  }
}

/* ═══════════════════════════════════════════════════════════════
   BULK OPENING STOCK
   Set initial stock levels for multiple products at once
═══════════════════════════════════════════════════════════════ */

export async function setBulkOpeningStockAction(
  siteId: string | null,
  items: { productId: string; variantId?: string | null; stock: number }[]
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);
    if (items.length === 0) return { success: false, error: "No items provided" };

    // Verify all products belong to this master
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products   = await prisma.product.findMany({
      where:   { id: { in: productIds }, masterProfileId: identity.masterProfileId, deletedAt: null },
      include: { variants: { where: { deletedAt: null } } },
    });
    if (products.length !== productIds.length) {
      return { success: false, error: "One or more products not found" };
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const movements: Parameters<typeof prisma.stockMovement.create>[0]["data"][] = [];
    const productUpdates: { id: string; stock: number }[]   = [];
    const variantUpdates:  { id: string; stock: number }[]  = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) continue;
        movements.push({
          type: "OPENING", quantity: item.stock,
          quantityBefore: variant.stock, quantityAfter: item.stock,
          note: "Opening stock entry",
          productId: item.productId, variantId: item.variantId,
          siteId, masterProfileId: identity.masterProfileId,
        });
        variantUpdates.push({ id: item.variantId, stock: item.stock });
      } else {
        movements.push({
          type: "OPENING", quantity: item.stock,
          quantityBefore: product.stock, quantityAfter: item.stock,
          note: "Opening stock entry",
          productId: item.productId, variantId: null,
          siteId, masterProfileId: identity.masterProfileId,
        });
        productUpdates.push({ id: item.productId, stock: item.stock });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const data of movements) {
        await tx.stockMovement.create({ data });
      }
      for (const { id, stock } of productUpdates) {
        await tx.product.update({ where: { id }, data: { stock } });
      }
      for (const { id, stock } of variantUpdates) {
        await tx.productVariant.update({ where: { id }, data: { stock } });
      }
    });

    revalidateStock(siteId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to set opening stock" };
  }
}

/* ═══════════════════════════════════════════════════════════════
   STOCK HISTORY QUERY
   Returns paginated movement history for a site or product
═══════════════════════════════════════════════════════════════ */

export async function getStockHistoryAction(
  siteId: string | null,
  options: {
    productId?: string;
    type?:      string;
    take?:      number;
    skip?:      number;
  } = {}
) {
  try {
    const identity = await resolveIdentity(siteId);
    const { productId, type, take = 50, skip = 0 } = options;

    const where = {
      masterProfileId: identity.masterProfileId,
      ...(siteId    ? { siteId }    : {}),
      ...(productId ? { productId } : {}),
      ...(type      ? { type: type as any } : {}),
    };

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { id: true, name: true } },
          site:    { select: { id: true, name: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { success: true as const, movements, total };
  } catch {
    return { success: false as const, error: "Failed to load stock history" };
  }
}

/* ═══════════════════════════════════════════════════════════════
   STOCK LEVELS QUERY
   Current stock for all products at a site, with low-stock flags
═══════════════════════════════════════════════════════════════ */

export async function getStockLevelsAction(
  siteId: string | null,
  options: { filter?: "all" | "low" | "out"; search?: string } = {}
) {
  try {
    const identity = await resolveIdentity(siteId);
    const { filter = "all", search } = options;

    const products = await prisma.product.findMany({
      where: {
        masterProfileId: identity.masterProfileId,
        deletedAt:       null,
        isActive:        true,
        ...(siteId ? { OR: [{ siteId }, { siteId: null }] } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: {
        variants: { where: { deletedAt: null, isActive: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    const enriched = products
      .map((p) => {
        const totalStock = p.hasVariants
          ? p.variants.reduce((s, v) => s + v.stock, 0)
          : p.stock;
        const threshold = p.lowStockThreshold ?? 5;
        const status: "ok" | "low" | "out" =
          totalStock === 0  ? "out" :
          totalStock <= threshold ? "low" : "ok";
        return { ...p, totalStock, threshold, status };
      })
      .filter((p) => {
        if (filter === "low") return p.status === "low";
        if (filter === "out") return p.status === "out";
        return true;
      });

    return { success: true as const, products: enriched };
  } catch {
    return { success: false as const, error: "Failed to load stock levels" };
  }
}
