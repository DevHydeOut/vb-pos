"use client";

// src/components/portal/portal-nav.tsx

import { usePathname } from "next/navigation";
import Link            from "next/link";
import { ROUTES }      from "@/routes";
import {
  Package, ShoppingCart, Receipt, BarChart3, ClipboardList,
  Truck, Settings, Boxes, Tag, Users, FileText,
  Star, SlidersHorizontal, History, ArrowLeftRight,
  PackagePlus,
} from "lucide-react";

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory: Package,
  sale:      ShoppingCart,
  billing:   Receipt,
  loyalty:   Star,
  reports:   BarChart3,
  orders:    ClipboardList,
  suppliers: Truck,
  stock:     Boxes,
  settings:  Settings,
  customers: Users,
  pos:       ShoppingCart,
};

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "inventory.products":   Boxes,
  "inventory.categories": Tag,
  "inventory.suppliers":  Truck,
  "inventory.stock":      Boxes,
  "inventory.adjust":     SlidersHorizontal,
  "inventory.history":    History,
  "inventory.receive":    PackagePlus,
  "inventory.transfers":  ArrowLeftRight,
  "sale.billing":         Receipt,
  "sale.stock":           Boxes,
  "sale.orders":          ClipboardList,
  "sale.customers":       Users,
  "customers.list":       Users,
  "customers.loyalty":    Star,
  "settings.general":     Settings,
  "settings.loyalty":     Star,
  "pos.checkout":         ShoppingCart,
  "pos.orders":           ClipboardList,
  "billing.pos":          Receipt,
  "loyalty.customers":    Users,
  "loyalty.rewards":      Star,
  "reports.sales":        BarChart3,
  "reports.stock":        Boxes,
  "reports.loyalty":      Star,
};

interface NavPage   { id: string; key: string; label: string }
interface NavModule { key: string; label: string; pages: NavPage[] }

interface PortalNavProps {
  siteId:                string;
  modules:               NavModule[];
  pendingTransferCount?: number;
}

export function PortalNav({ siteId, modules, pendingTransferCount = 0 }: PortalNavProps) {
  const pathname = usePathname();

  const relative   = pathname.replace(`/portal/${siteId}`, "");
  const parts      = relative.split("/").filter(Boolean);
  const currentMod = parts[0] ?? null;
  const currentPg  = parts[1] ?? null;

  const activeModule = modules.find((m) => m.key === currentMod);
  if (!activeModule || activeModule.pages.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <nav className="pointer-events-auto flex items-end gap-1
        bg-background/95 backdrop-blur-xl border border-border
        rounded-2xl shadow-xl shadow-black/10 px-2.5 py-2.5">

        {/* Module home tab */}
        {(() => {
          const Icon     = MODULE_ICONS[activeModule.key] ?? Package;
          const isActive = currentPg === null;
          return (
            <Link
              href={ROUTES.staff.module(siteId, activeModule.key)}
              className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl
                transition-all duration-150 min-w-15 ${
                isActive
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium leading-none truncate max-w-16 text-center">
                {activeModule.label}
              </span>
            </Link>
          );
        })()}

        {/* Divider */}
        <div className="w-px h-10 bg-border mx-0.5 self-center shrink-0" />

        {/* Page tabs */}
        {activeModule.pages.map((page) => {
          const pageKey         = page.key.split(".")[1];
          const isActive        = currentPg === pageKey;
          const Icon            = PAGE_ICONS[page.key] ?? FileText;
          const isTransferPage  = page.key === "inventory.transfers";
          const showBadge       = isTransferPage && pendingTransferCount > 0;

          return (
            <Link
              key={page.id}
              href={ROUTES.staff.page(siteId, activeModule.key, pageKey)}
              className={`relative flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl
                transition-all duration-150 min-w-15 ${
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5 shrink-0" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 bg-warning
                    text-white text-xs font-bold rounded-full flex items-center justify-center
                    px-0.5 leading-none">
                    {pendingTransferCount > 9 ? "9+" : pendingTransferCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium leading-none truncate max-w-16 text-center">
                {page.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
