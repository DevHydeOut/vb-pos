"use client";

// src/components/staff/module-cards.tsx

import Link from "next/link";
import { ROUTES } from "@/routes";
import {
  Package, Receipt, Users, BarChart3, Settings,
  ClipboardList, Truck, ShoppingCart, Boxes, ArrowRight,
  ArrowLeftRight, Star,
} from "lucide-react";

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory: Package,
  sale:      ShoppingCart,
  billing:   Receipt,
  loyalty:   Star,
  customers: Users,
  reports:   BarChart3,
  orders:    ClipboardList,
  suppliers: Truck,
  stock:     Boxes,
  settings:  Settings,
  pos:       ShoppingCart,
};

const DEFAULT_ICON = Package;

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "inventory.products":   "Manage your product catalogue",
  "inventory.categories": "Organise by category",
  "inventory.stock":      "View current stock levels",
  "inventory.adjust":     "Stock in / out entries",
  "inventory.history":    "Full movement history",
  "inventory.receive":    "Receive from supplier",
  "inventory.transfers":  "Send stock between sites",
  "customers.list":       "Customer directory",
  "customers.loyalty":    "Points & rewards",
  "sale.coupons":         "Discount codes",
  "sale.billing":         "Raise invoices",
  "settings.general":     "Site preferences",
  "settings.tax":         "Tax groups & rates",
  "settings.loyalty":     "Loyalty programme setup",
  "pos.checkout":         "Point-of-sale terminal",
  "pos.orders":           "Order history",
  "billing.pos":          "POS billing and checkout",
  "loyalty.customers":    "Global customer points",
  "loyalty.rewards":      "Rewards and earning rules",
  "reports.sales":        "Sales analytics",
  "reports.stock":        "Stock analytics",
  "reports.loyalty":      "Loyalty analytics",
};

interface Module {
  id:        string;
  key:       string;
  label:     string;
  sortOrder: number;
  pages:     { id: string; key: string; label: string }[];
}

interface ModuleCardsProps {
  modules:               Module[];
  siteId:                string;
  pendingTransferCount?: number;
}

export function ModuleCards({ modules, siteId, pendingTransferCount = 0 }: ModuleCardsProps) {
  if (modules.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-2xl p-20 text-center space-y-3">
        <div className="flex justify-center">
          <div className="bg-muted rounded-2xl p-5">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-foreground">No modules assigned</p>
          <p className="text-sm text-muted-foreground mt-1">Contact your administrator to get access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map((mod) => {
        const Icon         = MODULE_ICONS[mod.key] ?? DEFAULT_ICON;
        const hasTransfers = mod.pages.some((p) => p.key === "inventory.transfers");
        const showBadge    = hasTransfers && pendingTransferCount > 0;
        return (
          <Link
            key={mod.id}
            href={ROUTES.staff.module(siteId, mod.key)}
            className="group relative flex flex-col gap-4 bg-card border border-border rounded-2xl p-5
              hover:border-foreground/20 hover:shadow-md transition-all"
          >
            {/* Pending transfer badge on top-right of card */}
            {showBadge && (
              <span className="absolute top-4 right-4 flex items-center gap-1 bg-warning
                text-white text-xs font-bold px-2 py-0.5 rounded-full">
                <ArrowLeftRight className="h-3 w-3" />
                {pendingTransferCount} pending
              </span>
            )}

            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center
              group-hover:scale-105 transition-transform shrink-0">
              <Icon className="h-5 w-5 text-background" />
            </div>

            <div className="flex-1 space-y-3">
              {/* Module name */}
              <h3 className="font-semibold text-foreground text-base leading-tight pr-20">
                {mod.label}
              </h3>

              {/* Page chips — each page as a clickable pill */}
              {mod.pages.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {mod.pages.map((page) => {
                    const isTransfer    = page.key === "inventory.transfers";
                    const transferBadge = isTransfer && pendingTransferCount > 0;
                    return (
                      <span
                        key={page.id}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                          transferBadge
                            ? "bg-warning-muted text-warning-muted border-orange-300/60"
                            : "bg-muted/60 text-muted-foreground border-transparent"
                        }`}
                      >
                        {page.label}
                        {transferBadge && (
                          <span className="w-4 h-4 bg-warning text-white rounded-full text-xs
                            font-bold flex items-center justify-center leading-none">
                            {pendingTransferCount > 9 ? "9+" : pendingTransferCount}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Single-line description from first known page */}
              {(() => {
                const desc = mod.pages.map((p) => PAGE_DESCRIPTIONS[p.key]).filter(Boolean)[0];
                return desc
                  ? <p className="text-xs text-muted-foreground">{desc} & more</p>
                  : null;
              })()}
            </div>

            {/* Open */}
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground
              group-hover:text-foreground transition-colors">
              Open <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
