// src/lib/events.ts
// ─────────────────────────────────────────────────────────────
// Central event bus for the entire application.
// Every action fires a named event here instead of creating
// notifications directly. This file is the ONLY place that
// decides what happens when something occurs in the app.
//
// USAGE (in any server action):
//   import { fireEvent } from "@/lib/events";
//   fireEvent({ type: "TRANSFER_CREATED", ... }); // fire and forget
//
// TO ADD A NEW EVENT:
//   1. Add the type to AppEvent union below
//   2. Add a case to handleEvent()
//   3. Call fireEvent() from the relevant action
// ─────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════════
// EVENT DEFINITIONS
// Every possible thing that can happen in the app.
// Add new events here as you build new features.
// ═══════════════════════════════════════════════════════════════

export type AppEvent =

  // ── Inventory: Stock Transfers ────────────────────────────
  | {
      type:            "TRANSFER_CREATED";
      transferId:      string;
      referenceNo:     string;
      fromSiteId:      string;
      fromSiteName:    string;
      toSiteId:        string;
      toSiteName:      string;
      itemCount:       number;
      masterProfileId: string;
    }
  | {
      type:            "TRANSFER_ACCEPTED";
      transferId:      string;
      referenceNo:     string;
      fromSiteId:      string;
      toSiteId:        string;
      toSiteName:      string;
      masterProfileId: string;
    }
  | {
      type:            "TRANSFER_REJECTED";
      transferId:      string;
      referenceNo:     string;
      fromSiteId:      string;
      toSiteId:        string;
      toSiteName:      string;
      rejectionNote:   string | null;
      masterProfileId: string;
    }
  | {
      type:            "TRANSFER_CANCELLED";
      transferId:      string;
      referenceNo:     string;
      fromSiteId:      string;
      toSiteId:        string;
      masterProfileId: string;
    }

  // ── Inventory: Stock Levels ───────────────────────────────
  | {
      type:            "STOCK_LOW";
      productId:       string;
      productName:     string;
      variantId:       string | null;
      variantName:     string | null;
      siteId:          string;
      currentStock:    number;
      threshold:       number;
      masterProfileId: string;
    }
  | {
      type:            "STOCK_OUT";          // hit zero
      productId:       string;
      productName:     string;
      variantId:       string | null;
      variantName:     string | null;
      siteId:          string;
      masterProfileId: string;
    }

  | {
      type:            "PRODUCT_CREATED";
      productId:       string;
      productName:     string;
      siteId:          string | null;
      masterProfileId: string;
    }
  | {
      type:            "CATEGORY_CREATED";
      categoryId:      string;
      categoryName:    string;
      siteId:          string | null;
      masterProfileId: string;
    }

  // ── Sales / Billing (scaffold — fill when building POS) ───
  | {
      type:            "SALE_COMPLETED";
      saleId:          string;
      referenceNo:     string;
      siteId:          string;
      totalAmount:     number;
      customerId:      string | null;
      masterProfileId: string;
    }
  | {
      type:            "SALE_REFUNDED";
      saleId:          string;
      referenceNo:     string;
      siteId:          string;
      refundAmount:    number;
      masterProfileId: string;
    }
  | {
      type:            "BILL_CREATED";
      billId:          string;
      referenceNo:     string;
      siteId:          string;
      customerId:      string | null;
      totalAmount:     number;
      masterProfileId: string;
    }
  | {
      type:            "BILL_OVERDUE";
      billId:          string;
      referenceNo:     string;
      siteId:          string;
      daysOverdue:     number;
      masterProfileId: string;
    }

  // ── Loyalty ───────────────────────────────────────────────
  | {
      type:            "LOYALTY_POINTS_EARNED";
      customerId:      string;
      customerName:    string;
      points:          number;
      newBalance:      number;
      siteId:          string;
      masterProfileId: string;
    }
  | {
      type:            "LOYALTY_REWARD_REDEEMED";
      customerId:      string;
      customerName:    string;
      rewardName:      string;
      pointsUsed:      number;
      siteId:          string;
      masterProfileId: string;
    }
  | {
      type:            "LOYALTY_POINTS_EXPIRING";  // scheduled job fires this
      customerId:      string;
      customerName:    string;
      points:          number;
      expiresInDays:   number;
      siteId:          string;
      masterProfileId: string;
    }

  // ── Staff / Auth ──────────────────────────────────────────
  | {
      type:            "STAFF_LOGIN";
      subUserId:       string;
      staffName:       string;
      siteId:          string;
      masterProfileId: string;
    }
  | {
      type:            "STAFF_FAILED_LOGIN";
      username:        string;
      accountId:       string;
      attempts:        number;
      masterProfileId: string;
    }

  // ── System ────────────────────────────────────────────────
  | {
      type:            "SYSTEM_MESSAGE";
      title:           string;
      message:         string;
      siteId:          string;
      masterProfileId: string;
    };

// ═══════════════════════════════════════════════════════════════
// FIRE — public API, always fire-and-forget, never awaited
// ═══════════════════════════════════════════════════════════════

export function fireEvent(event: AppEvent): void {
  handleEvent(event).catch((e) =>
    console.error(`[events] Handler failed for ${event.type}:`, e)
  );
}

// ═══════════════════════════════════════════════════════════════
// HANDLE — private, routes each event to the right logic
// ═══════════════════════════════════════════════════════════════

async function handleEvent(event: AppEvent): Promise<void> {
  switch (event.type) {

    // ── Transfer: notify destination ─────────────────────────
    case "TRANSFER_CREATED":
      await notify({
        type:            "TRANSFER_INCOMING",
        title:           "Incoming Stock Transfer",
        message:         `${event.referenceNo} — ${event.itemCount} item(s) sent from ${event.fromSiteName}. Review and accept or reject.`,
        siteId:          event.toSiteId,
        masterProfileId: event.masterProfileId,
        actionUrl:       `/portal/${event.toSiteId}/inventory/transfers`,
        referenceId:     event.transferId,
        referenceType:   "StockTransfer",
      });
      break;

    // ── Transfer accepted: notify sender ─────────────────────
    case "TRANSFER_ACCEPTED":
      await notify({
        type:            "TRANSFER_ACCEPTED",
        title:           "Transfer Accepted",
        message:         `${event.referenceNo} was accepted by ${event.toSiteName}. Stock has been updated.`,
        siteId:          event.fromSiteId,
        masterProfileId: event.masterProfileId,
        actionUrl:       `/portal/${event.fromSiteId}/inventory/transfers`,
        referenceId:     event.transferId,
        referenceType:   "StockTransfer",
      });
      break;

    // ── Transfer rejected: notify sender ─────────────────────
    case "TRANSFER_REJECTED":
      await notify({
        type:            "TRANSFER_REJECTED",
        title:           "Transfer Rejected",
        message:         `${event.referenceNo} was rejected by ${event.toSiteName}.${event.rejectionNote ? ` Reason: ${event.rejectionNote}` : ""}`,
        siteId:          event.fromSiteId,
        masterProfileId: event.masterProfileId,
        actionUrl:       `/portal/${event.fromSiteId}/inventory/transfers`,
        referenceId:     event.transferId,
        referenceType:   "StockTransfer",
      });
      break;

    // ── Transfer cancelled: notify destination ────────────────
    case "TRANSFER_CANCELLED":
      await notify({
        type:            "TRANSFER_CANCELLED",
        title:           "Transfer Cancelled",
        message:         `A pending transfer (${event.referenceNo}) from the sender was cancelled.`,
        siteId:          event.toSiteId,
        masterProfileId: event.masterProfileId,
        actionUrl:       `/portal/${event.toSiteId}/inventory/transfers`,
        referenceId:     event.transferId,
        referenceType:   "StockTransfer",
      });
      break;

    // ── Low stock alert ───────────────────────────────────────
    case "STOCK_LOW": {
      const itemName = event.variantName
        ? `${event.productName} — ${event.variantName}`
        : event.productName;
      await notify({
        type:            "LOW_STOCK",
        title:           "Low Stock Alert",
        message:         `${itemName} is running low (${event.currentStock} left, threshold: ${event.threshold}).`,
        siteId:          event.siteId,
        masterProfileId: event.masterProfileId,
        actionUrl:       `/portal/${event.siteId}/inventory/stock`,
        referenceId:     event.productId,
        referenceType:   "Product",
      });
      break;
    }

    // ── Out of stock ──────────────────────────────────────────
    case "STOCK_OUT": {
      const itemName = event.variantName
        ? `${event.productName} — ${event.variantName}`
        : event.productName;
      await notify({
        type:            "LOW_STOCK",
        title:           "Out of Stock",
        message:         `${itemName} is now out of stock.`,
        siteId:          event.siteId,
        masterProfileId: event.masterProfileId,
        actionUrl:       `/portal/${event.siteId}/inventory/stock`,
        referenceId:     event.productId,
        referenceType:   "Product",
      });
      break;
    }

    case "PRODUCT_CREATED":
      await notifyCatalogSites({
        masterProfileId: event.masterProfileId,
        siteId: event.siteId,
        title: "New Product Added",
        message: `${event.productName} was added to the catalogue.`,
        actionPath: "inventory/products",
        referenceId: event.productId,
        referenceType: "Product",
      });
      break;

    case "CATEGORY_CREATED":
      await notifyCatalogSites({
        masterProfileId: event.masterProfileId,
        siteId: event.siteId,
        title: "New Category Added",
        message: `${event.categoryName} was added to product categories.`,
        actionPath: "inventory/products",
        referenceId: event.categoryId,
        referenceType: "Category",
      });
      break;

    // ── Sale / billing — scaffold, fill when building POS ─────
    case "SALE_COMPLETED":
      // TODO: notify admin dashboard, trigger loyalty points
      break;

    case "SALE_REFUNDED":
      // TODO: notify admin
      break;

    case "BILL_CREATED":
      // TODO: notify customer (SMS/email later)
      break;

    case "BILL_OVERDUE":
      // TODO: notify site manager
      break;

    // ── Loyalty — scaffold ────────────────────────────────────
    case "LOYALTY_POINTS_EARNED":
      // TODO: optional notification to customer (SMS later)
      break;

    case "LOYALTY_REWARD_REDEEMED":
      // TODO: notify admin dashboard
      break;

    case "LOYALTY_POINTS_EXPIRING":
      // TODO: SMS/email customer warning
      break;

    // ── Staff ─────────────────────────────────────────────────
    case "STAFF_LOGIN":
      // TODO: optionally notify master on first login of day
      break;

    case "STAFF_FAILED_LOGIN":
      // TODO: notify master if attempts >= 5 (account lockout warning)
      break;

    // ── System ───────────────────────────────────────────────
    case "SYSTEM_MESSAGE":
      await notify({
        type:            "SYSTEM",
        title:           event.title,
        message:         event.message,
        siteId:          event.siteId,
        masterProfileId: event.masterProfileId,
        actionUrl:       null,
        referenceId:     null,
        referenceType:   null,
      });
      break;

    default:
      // Exhaustive check — TypeScript will error if a case is missing
      const _exhaustive: never = event;
      console.warn("[events] Unhandled event type:", (_exhaustive as AppEvent).type);
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFY — internal helper, creates a Notification row
// ═══════════════════════════════════════════════════════════════

async function notify(data: {
  type:            string;
  title:           string;
  message:         string;
  siteId:          string;
  masterProfileId: string;
  actionUrl:       string | null;
  referenceId:     string | null;
  referenceType:   string | null;
}) {
  await prisma.notification.create({
    data: {
      type:            data.type as never,
      title:           data.title,
      message:         data.message,
      siteId:          data.siteId,
      masterProfileId: data.masterProfileId,
      actionUrl:       data.actionUrl,
      referenceId:     data.referenceId,
      referenceType:   data.referenceType,
    },
  });
}

async function notifyCatalogSites(data: {
  masterProfileId: string;
  siteId: string | null;
  title: string;
  message: string;
  actionPath: string;
  referenceId: string;
  referenceType: string;
}) {
  const sites = await prisma.site.findMany({
    where: {
      masterProfileId: data.masterProfileId,
      isActive: true,
      ...(data.siteId ? { id: data.siteId } : {}),
    },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: sites.map((site) => ({
      type: "SYSTEM",
      title: data.title,
      message: data.message,
      siteId: site.id,
      masterProfileId: data.masterProfileId,
      actionUrl: `/portal/${site.id}/${data.actionPath}`,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
    })),
  });
}
