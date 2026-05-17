"use server";

// src/actions/portal/stock-transfer.ts

import { revalidatePath }   from "next/cache";
import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { fireEvent } from "@/lib/events";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ActionResult<T = undefined> =
  | { success: true;  data?: T }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────
// Identity helper — same pattern as action-stock.ts
// ─────────────────────────────────────────────────────────────

async function resolveIdentity(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult.masterProfile.id, isActive: true },
      select: { id: true },
    });
    if (!site) throw new Error("Site not found");
    return {
      masterProfileId: masterResult.masterProfile.id,
      actorId:         masterResult.masterProfile.userId,
      isMaster:        true,
    };
  }
  const staffSession = await getStaffSession().catch(() => null);
  if (staffSession) {
    const subUserSite = await prisma.subUserSite.findUnique({
      where: { subUserId_siteId: { subUserId: staffSession.subUserId, siteId } },
      include: { site: true, permissions: { include: { module: true, page: true } } },
    });
    if (!subUserSite?.site.isActive) throw new Error("Site not found");
    const canTransfer = subUserSite.permissions.some(
      (permission) =>
        (permission.module?.key === "inventory" && !permission.page) ||
        permission.page?.key === "inventory.transfers" ||
        permission.page?.key === "inventory.adjust"
    );
    if (!canTransfer) throw new Error("You do not have stock transfer permission");
    return {
      masterProfileId: subUserSite.site.masterProfileId,
      actorId:         staffSession.subUser.id,
      isMaster:        false,
    };
  }
  throw new Error("Unauthorized");
}

// ─────────────────────────────────────────────────────────────
// Reference number generators
// ─────────────────────────────────────────────────────────────

async function genTransferRef(masterProfileId: string): Promise<string> {
  const count = await prisma.stockTransfer.count({ where: { masterProfileId } });
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TRF-${date}-${String(count + 1).padStart(4, "0")}`;
}

async function genReceiveRef(masterProfileId: string): Promise<string> {
  const count = await prisma.stockReceive.count({ where: { masterProfileId } });
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GRN-${date}-${String(count + 1).padStart(4, "0")}`;
}

function revalidateInventory(siteId: string) {
  revalidatePath(`/portal/${siteId}/inventory/stock`);
  revalidatePath(`/portal/${siteId}/inventory/stock`);
  revalidatePath(`/portal/${siteId}/inventory/transfers`);
  revalidatePath(`/portal/${siteId}/inventory/adjust`);
}

// ═══════════════════════════════════════════════════════════════
// STOCK RECEIVING
// ═══════════════════════════════════════════════════════════════

export type ReceiveLineItem = {
  productId:  string;
  variantId?: string | null;
  quantity:   number;
  costPrice?: number | null;
};

export async function createStockReceiveAction(
  siteId: string,
  items:  ReceiveLineItem[],
  opts: {
    movementType:  "PURCHASE" | "OPENING";
    supplierName?: string;
    note?:         string;
    generateBill?: boolean;
  }
): Promise<ActionResult<{ id: string; referenceNo: string }>> {
  try {
    if (!items.length) return { success: false, error: "No items added" };

    const identity    = await resolveIdentity(siteId);
    const referenceNo = await genReceiveRef(identity.masterProfileId);

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products   = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        masterProfileId: identity.masterProfileId,
        deletedAt: null,
        OR: [{ siteId }, { siteId: null, isGlobal: true }],
      },
      include: { variants: { where: { deletedAt: null, isActive: true } } },
    });
    if (products.length !== productIds.length)
      return { success: false, error: "One or more products not found" };

    const productMap = new Map(products.map((p) => [p.id, p]));

    const receive = await prisma.$transaction(async (tx) => {
      const rec = await tx.stockReceive.create({
        data: {
          referenceNo,
          supplierName:    opts.supplierName ?? null,
          note:            opts.note         ?? null,
          movementType:    opts.movementType,
          generateBill:    opts.generateBill ?? false,
          siteId,
          masterProfileId: identity.masterProfileId,
          createdBy:       identity.actorId,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId ?? null,
              quantity:  i.quantity,
              costPrice: i.costPrice ?? null,
            })),
          },
        },
      });

      for (const item of items) {
        const product  = productMap.get(item.productId)!;
        const noteText = opts.note
          ?? `${opts.movementType === "PURCHASE" ? "Purchase received" : "Opening stock"}: ${referenceNo}`;

        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) continue;
          const qBefore = variant.stock;
          const qAfter  = qBefore + item.quantity;
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: qAfter } });
          await tx.stockMovement.create({
            data: {
              type: opts.movementType, quantity: item.quantity,
              quantityBefore: qBefore, quantityAfter: qAfter,
              note: noteText,
              productId: item.productId, variantId: item.variantId,
              siteId, masterProfileId: identity.masterProfileId,
              orderId: rec.id, createdBy: identity.actorId,
            },
          });
        } else {
          const qBefore = product.stock;
          const qAfter  = qBefore + item.quantity;
          await tx.product.update({ where: { id: item.productId }, data: { stock: qAfter } });
          await tx.stockMovement.create({
            data: {
              type: opts.movementType, quantity: item.quantity,
              quantityBefore: qBefore, quantityAfter: qAfter,
              note: noteText,
              productId: item.productId, variantId: null,
              siteId, masterProfileId: identity.masterProfileId,
              orderId: rec.id, createdBy: identity.actorId,
            },
          });
        }
      }

      return rec;
    });

    revalidateInventory(siteId);
    return { success: true, data: { id: receive.id, referenceNo: receive.referenceNo } };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to save stock receive" };
  }
}

// ═══════════════════════════════════════════════════════════════
// STOCK TRANSFER — CREATE (PENDING, no stock change)
// ═══════════════════════════════════════════════════════════════

export type TransferLineItem = {
  productId:  string;
  variantId?: string | null;
  quantity:   number;
  costPrice?: number | null;
};

export async function createStockTransferAction(
  fromSiteId: string,
  toSiteId:   string,
  items:      TransferLineItem[],
  opts: { note?: string; generateBill?: boolean }
): Promise<ActionResult<{ id: string; referenceNo: string }>> {
  try {
    if (!items.length)           return { success: false, error: "No items added" };
    if (fromSiteId === toSiteId) return { success: false, error: "Source and destination cannot be the same site" };

    const identity    = await resolveIdentity(fromSiteId);
    const referenceNo = await genTransferRef(identity.masterProfileId);

    const [toSite, fromSite] = await Promise.all([
      prisma.site.findFirst({
        where: { id: toSiteId, masterProfileId: identity.masterProfileId, isActive: true },
      }),
      prisma.site.findFirst({
        where: { id: fromSiteId },
        select: { name: true },
      }),
    ]);
    if (!toSite) return { success: false, error: "Destination site not found" };

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products   = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        masterProfileId: identity.masterProfileId,
        deletedAt: null,
        siteId: fromSiteId,
      },
      include: { variants: { where: { deletedAt: null, isActive: true } } },
    });
    if (products.length !== productIds.length)
      return { success: false, error: "One or more products not found" };

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Stock check at source
    for (const item of items) {
      const product = productMap.get(item.productId)!;
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) return { success: false, error: `Variant not found for ${product.name}` };
        if (variant.stock < item.quantity)
          return { success: false, error: `Not enough stock for ${product.name} (${variant.name}): have ${variant.stock}, need ${item.quantity}` };
      } else {
        if (product.stock < item.quantity)
          return { success: false, error: `Not enough stock for ${product.name}: have ${product.stock}, need ${item.quantity}` };
      }
    }

    const transfer = await prisma.stockTransfer.create({
      data: {
        referenceNo,
        status:          "PENDING",
        fromSiteId,
        toSiteId,
        masterProfileId: identity.masterProfileId,
        note:            opts.note         ?? null,
        generateBill:    opts.generateBill ?? false,
        createdBy:       identity.actorId,
        items: {
          create: items.map((i) => ({
            productId:    i.productId,
            variantId:    i.variantId ?? null,
            quantitySent: i.quantity,
            costPrice:    i.costPrice ?? null,
          })),
        },
      },
    });

    revalidatePath(`/portal/${fromSiteId}/inventory/transfers`);
    revalidatePath(`/portal/${toSiteId}/inventory/transfers`);

    // Notify destination site (fire-and-forget)
    fireEvent({
      type:            "TRANSFER_CREATED",
      transferId:      transfer.id,
      referenceNo:     transfer.referenceNo,
      fromSiteId,
      fromSiteName:    fromSite?.name ?? fromSiteId,
      toSiteId,
      toSiteName:      toSite.name,
      itemCount:       items.length,
      masterProfileId: identity.masterProfileId,
    });

    return { success: true, data: { id: transfer.id, referenceNo: transfer.referenceNo } };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to create transfer" };
  }
}

// ═══════════════════════════════════════════════════════════════
// STOCK TRANSFER — ACCEPT (stock moves here)
// ═══════════════════════════════════════════════════════════════

export async function acceptStockTransferAction(
  transferId:   string,
  siteId:       string,
  receivedQtys: { itemId: string; quantityReceived: number }[]
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);

    const transfer = await prisma.stockTransfer.findFirst({
      where:   { id: transferId, masterProfileId: identity.masterProfileId },
      include: {
        fromSite: { select: { id: true, name: true } },
        toSite:   { select: { id: true, name: true } },
        items: {
          include: {
            product: { include: { variants: { where: { isActive: true } } } },
            variant: true,
          },
        },
      },
    });

    if (!transfer)                     return { success: false, error: "Transfer not found" };
    if (transfer.status !== "PENDING") return { success: false, error: "Transfer is no longer pending" };
    if (transfer.toSiteId !== siteId)  return { success: false, error: "You are not the recipient of this transfer" };

    const qtyMap = new Map(receivedQtys.map((r) => [r.itemId, r.quantityReceived]));

    await prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const qtyReceived = qtyMap.get(item.id) ?? item.quantitySent;
        const qtySent     = item.quantitySent;

        await tx.stockTransferItem.update({
          where: { id: item.id },
          data:  { quantityReceived: qtyReceived },
        });

        if (qtyReceived === 0) continue;

        const ref = `Transfer ${transfer.referenceNo}`;
        const sourceProduct = item.product;
        const sourceIsSiteStock = sourceProduct.siteId === transfer.fromSiteId && !sourceProduct.isGlobal;
        let destinationProduct = { id: sourceProduct.id, stock: sourceProduct.stock };

        if (sourceIsSiteStock) {
          destinationProduct = await tx.product.findFirst({
            where: {
              masterProfileId: identity.masterProfileId,
              siteId: transfer.toSiteId,
              deletedAt: null,
              OR: [
                ...(sourceProduct.sku ? [{ sku: sourceProduct.sku }] : []),
                { name: sourceProduct.name },
              ],
            },
            select: { id: true, stock: true },
          }) ?? await tx.product.create({
            data: {
              name: sourceProduct.name,
              description: sourceProduct.description,
              sku: sourceProduct.sku,
              barcode: sourceProduct.barcode,
              categoryId: sourceProduct.categoryId,
              taxGroupId: sourceProduct.taxGroupId,
              costPrice: sourceProduct.costPrice,
              sellingPrice: sourceProduct.sellingPrice,
              stock: 0,
              lowStockThreshold: sourceProduct.lowStockThreshold,
              hasVariants: sourceProduct.hasVariants,
              isActive: true,
              isGlobal: false,
              masterProfileId: identity.masterProfileId,
              siteId: transfer.toSiteId,
            },
            select: { id: true, stock: true },
          });
        }

        if (item.variantId && item.variant) {
          // Deduct from source
          const freshV   = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          const beforeOut = freshV!.stock;
          const afterOut  = Math.max(0, beforeOut - qtySent);
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: afterOut } });
          await tx.stockMovement.create({
            data: {
              type: "TRANSFER_OUT", quantity: -qtySent,
              quantityBefore: beforeOut, quantityAfter: afterOut,
              note: `${ref} → ${transfer.toSite.name}`,
              productId: item.productId, variantId: item.variantId,
              siteId: transfer.fromSiteId, masterProfileId: identity.masterProfileId,
              orderId: transfer.id, createdBy: identity.actorId,
            },
          });
          // Add to destination
          let destinationVariant = item.variant;
          if (destinationProduct.id !== sourceProduct.id) {
            destinationVariant = await tx.productVariant.findFirst({
              where: {
                productId: destinationProduct.id,
                deletedAt: null,
                OR: [
                  ...(item.variant.sku ? [{ sku: item.variant.sku }] : []),
                  { name: item.variant.name },
                ],
              },
            }) ?? await tx.productVariant.create({
              data: {
                name: item.variant.name,
                sku: item.variant.sku,
                barcode: item.variant.barcode,
                costPrice: item.variant.costPrice,
                sellingPrice: item.variant.sellingPrice,
                stock: 0,
                lowStockThreshold: item.variant.lowStockThreshold,
                isActive: true,
                productId: destinationProduct.id,
              },
            });
          }
          const beforeIn = destinationProduct.id === sourceProduct.id ? afterOut : destinationVariant.stock;
          const afterIn = beforeIn + qtyReceived;
          await tx.productVariant.update({ where: { id: destinationVariant.id }, data: { stock: afterIn } });
          await tx.stockMovement.create({
            data: {
              type: "TRANSFER_IN", quantity: qtyReceived,
              quantityBefore: beforeIn, quantityAfter: afterIn,
              note: `${ref} ← ${transfer.fromSite.name}`,
              productId: destinationProduct.id, variantId: destinationVariant.id,
              siteId: transfer.toSiteId, masterProfileId: identity.masterProfileId,
              orderId: transfer.id, createdBy: identity.actorId,
            },
          });
        } else {
          // Product level
          const freshP    = await tx.product.findUnique({ where: { id: item.productId } });
          const beforeOut = freshP!.stock;
          const afterOut  = Math.max(0, beforeOut - qtySent);
          await tx.product.update({ where: { id: item.productId }, data: { stock: afterOut } });
          await tx.stockMovement.create({
            data: {
              type: "TRANSFER_OUT", quantity: -qtySent,
              quantityBefore: beforeOut, quantityAfter: afterOut,
              note: `${ref} → ${transfer.toSite.name}`,
              productId: item.productId, variantId: null,
              siteId: transfer.fromSiteId, masterProfileId: identity.masterProfileId,
              orderId: transfer.id, createdBy: identity.actorId,
            },
          });
          const beforeIn = destinationProduct.id === sourceProduct.id ? afterOut : destinationProduct.stock;
          const afterIn = beforeIn + qtyReceived;
          await tx.product.update({ where: { id: destinationProduct.id }, data: { stock: afterIn } });
          await tx.stockMovement.create({
            data: {
              type: "TRANSFER_IN", quantity: qtyReceived,
              quantityBefore: beforeIn, quantityAfter: afterIn,
              note: `${ref} ← ${transfer.fromSite.name}`,
              productId: destinationProduct.id, variantId: null,
              siteId: transfer.toSiteId, masterProfileId: identity.masterProfileId,
              orderId: transfer.id, createdBy: identity.actorId,
            },
          });
        }
      }

      await tx.stockTransfer.update({
        where: { id: transferId },
        data:  { status: "ACCEPTED", acceptedBy: identity.actorId, acceptedAt: new Date() },
      });
    });

    revalidateInventory(transfer.fromSiteId);
    revalidateInventory(transfer.toSiteId);

    // Notify sender (fire-and-forget)
    fireEvent({
      type:            "TRANSFER_ACCEPTED",
      transferId:      transfer.id,
      referenceNo:     transfer.referenceNo,
      fromSiteId:      transfer.fromSiteId,
      toSiteId:        transfer.toSiteId,
      toSiteName:      transfer.toSite.name,
      masterProfileId: identity.masterProfileId,
    });

    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to accept transfer" };
  }
}

// ═══════════════════════════════════════════════════════════════
// STOCK TRANSFER — REJECT
// ═══════════════════════════════════════════════════════════════

export async function rejectStockTransferAction(
  transferId: string,
  siteId:     string,
  note?:      string
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id: transferId, masterProfileId: identity.masterProfileId },
      include: { toSite: { select: { name: true } } },
    });
    if (!transfer)                     return { success: false, error: "Transfer not found" };
    if (transfer.status !== "PENDING") return { success: false, error: "Transfer is no longer pending" };
    if (transfer.toSiteId !== siteId)  return { success: false, error: "You are not the recipient of this transfer" };

    await prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: "REJECTED", rejectedBy: identity.actorId, rejectedAt: new Date(), rejectedNote: note ?? null },
    });

    revalidatePath(`/portal/${transfer.fromSiteId}/inventory/transfers`);
    revalidatePath(`/portal/${siteId}/inventory/transfers`);

    // Notify sender (fire-and-forget)
    fireEvent({
      type:            "TRANSFER_REJECTED",
      transferId:      transfer.id,
      referenceNo:     transfer.referenceNo,
      fromSiteId:      transfer.fromSiteId,
      toSiteId:        siteId,
      toSiteName:      transfer.toSite.name,
      rejectionNote:   note ?? null,
      masterProfileId: identity.masterProfileId,
    });

    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to reject transfer" };
  }
}

// ═══════════════════════════════════════════════════════════════
// STOCK TRANSFER — CANCEL
// ═══════════════════════════════════════════════════════════════

export async function cancelStockTransferAction(
  transferId: string,
  siteId:     string
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id: transferId, masterProfileId: identity.masterProfileId },
    });
    if (!transfer)                     return { success: false, error: "Transfer not found" };
    if (transfer.status !== "PENDING") return { success: false, error: "Only pending transfers can be cancelled" };
    if (transfer.fromSiteId !== siteId && !identity.isMaster)
      return { success: false, error: "Only the sender can cancel this transfer" };

    await prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: "CANCELLED", cancelledBy: identity.actorId, cancelledAt: new Date() },
    });

    revalidatePath(`/portal/${transfer.fromSiteId}/inventory/transfers`);
    revalidatePath(`/portal/${transfer.toSiteId}/inventory/transfers`);

    fireEvent({
      type:            "TRANSFER_CANCELLED",
      transferId:      transfer.id,
      referenceNo:     transfer.referenceNo,
      fromSiteId:      transfer.fromSiteId,
      toSiteId:        transfer.toSiteId,
      masterProfileId: identity.masterProfileId,
    });

    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to cancel transfer" };
  }
}

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

export async function getTransfersForSiteAction(siteId: string) {
  try {
    const identity = await resolveIdentity(siteId);
    const transfers = await prisma.stockTransfer.findMany({
      where: {
        masterProfileId: identity.masterProfileId,
        OR: [{ fromSiteId: siteId }, { toSiteId: siteId }],
      },
      include: {
        fromSite: { select: { id: true, name: true } },
        toSite:   { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } }, variant: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true as const, transfers };
  } catch (e) {
    console.error(e);
    return { success: false as const, error: "Failed to load transfers" };
  }
}

export async function getTransferDetailAction(transferId: string, siteId: string) {
  try {
    const identity = await resolveIdentity(siteId);
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id: transferId, masterProfileId: identity.masterProfileId },
      include: {
        fromSite: { select: { id: true, name: true } },
        toSite:   { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, sku: true, sellingPrice: true,
                images: { take: 1, orderBy: { sortOrder: "asc" } },
              },
            },
            variant: { select: { id: true, name: true, sku: true, sellingPrice: true } },
          },
        },
      },
    });
    if (!transfer) return { success: false as const, error: "Transfer not found" };
    return { success: true as const, transfer };
  } catch (e) {
    console.error(e);
    return { success: false as const, error: "Failed to load transfer" };
  }
}

// Badge count — pending transfers incoming to this site
export async function getPendingTransferCountAction(siteId: string) {
  try {
    const identity = await resolveIdentity(siteId);
    const count = await prisma.stockTransfer.count({
      where: { masterProfileId: identity.masterProfileId, toSiteId: siteId, status: "PENDING" },
    });
    return { success: true as const, count };
  } catch {
    return { success: true as const, count: 0 };
  }
}
