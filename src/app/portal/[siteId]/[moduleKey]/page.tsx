// src/app/(structure)/portal/[siteId]/[moduleKey]/page.tsx
// ─────────────────────────────────────────────────────────────
// SINGLE landing page for ALL modules.
// Delete inventory-module-page.tsx — this replaces it.
// To add a new module: just add its key to PAGE_CONFIG below.
// ─────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import { notFound }  from "next/navigation";
import { getStaffSession }  from "@/actions/auth/staff";
import { getMasterProfile } from "@/data/master";
import { prisma }           from "@/lib/prisma";
import { ROUTES }           from "@/routes";
import Link                 from "next/link";
import {
  Package, ShoppingCart, Receipt, Tag, BarChart3,
  Truck, Settings, ClipboardList, ArrowRight,
  FileText, Boxes, ListChecks, RefreshCcw, Users,
  Layers, History, SlidersHorizontal, ArrowLeftRight,
  Star, Percent, LayoutGrid,
} from "lucide-react";
import { isCoreModule, isCorePage } from "@/config/app-modules";

// ─────────────────────────────────────────────────────────────
// CONFIG — one entry per module + per page
// Add new modules/pages here. Nothing else needs to change.
// ─────────────────────────────────────────────────────────────

const MODULE_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  inventory: { icon: Package,      description: "Manage stock levels, stock entries and stock transfers between sites." },
  billing:   { icon: Receipt,      description: "Run a focused POS checkout with item discounts, tax and loyalty lookup." },
  loyalty:   { icon: Star,         description: "Review customer points and manage rewards customers can claim anywhere." },
  orders:    { icon: ClipboardList,description: "Track and fulfil customer orders." },
};

const PAGE_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  // ── Inventory ────────────────────────────────────────────────
  "inventory.products":    { icon: Boxes,              description: "Manage your full product catalogue, prices and details." },
  "inventory.categories":  { icon: Tag,                description: "Organise products into categories and types." },
  "inventory.suppliers":   { icon: Truck,              description: "Track your suppliers and purchase contacts." },
  "inventory.stock":       { icon: LayoutGrid,         description: "View current stock levels across all products." },
  "inventory.adjust":      { icon: SlidersHorizontal,  description: "Record stock-ins, write-offs and corrections." },
  "inventory.history":     { icon: History,            description: "Full audit log of all stock movements." },
  "inventory.transfers":   { icon: ArrowLeftRight,     description: "Move stock between locations." },
  "billing.pos":           { icon: Receipt,            description: "Create POS bills with customer phone, optional name and item-level discounts." },
  "loyalty.customers":     { icon: Users,              description: "See customers with global royalty points across all sites." },
  "loyalty.rewards":       { icon: Star,               description: "Create rewards, discount coupons and earning rules." },
  // ── Sale ─────────────────────────────────────────────────────
  "sale.billing":          { icon: Receipt,            description: "Create bills, process payments and print receipts." },
  "sale.coupons":          { icon: Percent,            description: "Create and manage discount coupons." },
  "sale.orders":           { icon: ClipboardList,      description: "Track and fulfil customer orders." },
  // ── Customers ────────────────────────────────────────────────
  "customers.list":        { icon: Users,              description: "View and manage your customer database." },
  "customers.loyalty":     { icon: Star,               description: "Loyalty points, rewards and redemption rules." },
  // ── Settings ─────────────────────────────────────────────────
  "settings.general":      { icon: Settings,           description: "Site name, timezone, currency and preferences." },
  "settings.tax":          { icon: Percent,            description: "Manage tax groups and rates for your products." },
  "settings.loyalty":      { icon: Star,               description: "Set up your loyalty programme rules." },
  // ── Reports ──────────────────────────────────────────────────
  "reports.sales":         { icon: BarChart3,          description: "Analyse revenue, volume and trends." },
  "reports.inventory":     { icon: ListChecks,         description: "Audit stock levels and movements." },
  // ── Billing ──────────────────────────────────────────────────
  "billing.invoices":      { icon: Receipt,            description: "Manage invoices and payment history." },
  // ── Orders ───────────────────────────────────────────────────
  "orders.list":           { icon: ClipboardList,      description: "View all orders across your site." },
};

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default async function ModuleLandingPage({
  params,
}: {
  params: Promise<{ siteId: string; moduleKey: string }>;
}) {
  const { siteId, moduleKey } = await params;
  if (!isCoreModule(moduleKey)) notFound();

  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);
  if (!staffSession && !masterResult) redirect(ROUTES.auth.login);

  const isMaster = !!masterResult && !staffSession;

  // Fetch module + its pages from DB
  const module = await prisma.module.findUnique({
    where:   { key: moduleKey },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!module) notFound();

  // Determine which pages this user can see
  let visiblePages: typeof module.pages;

  if (isMaster) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult!.masterProfile.id },
    });
    if (!site || !site.isActive) notFound();
    visiblePages = module.pages.filter((p) => isCorePage(p.key));
  } else {
    const subUserSite = await prisma.subUserSite.findUnique({
      where:   { subUserId_siteId: { subUserId: staffSession!.subUser.id, siteId } },
      include: { site: true, permissions: { include: { module: true, page: true } } },
    });
    if (!subUserSite || !subUserSite.site.isActive) notFound();

    const hasModuleAccess = subUserSite.permissions.some(
      (p) => p.module?.id === module.id
    );
    if (!hasModuleAccess) notFound();

    const hasFullAccess  = subUserSite.permissions.some(
      (p) => p.module?.id === module.id && !p.page
    );
    const allowedPageIds = subUserSite.permissions
      .filter((p) => p.module?.id === module.id && p.page)
      .map((p) => p.page!.id);

    visiblePages = (hasFullAccess
      ? module.pages
      : module.pages.filter((p) => allowedPageIds.includes(p.id)))
      .filter((p) => isCorePage(p.key));

    if (visiblePages.length === 0) notFound();
  }

  const moduleCfg = MODULE_CONFIG[moduleKey];
  const ModuleIcon = moduleCfg?.icon ?? Package;

  return (
    <main className="min-h-full px-6 py-10 space-y-10">

      {/* ── Module header ────────────────────────────────────── */}
      <div className="flex items-start gap-5">
        <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center shrink-0 mt-0.5">
          <ModuleIcon className="h-7 w-7 text-background" />
        </div>
        <div className="space-y-1 pt-1">
          {/* ✓ uses actual module.label from DB — not a string literal */}
          <h1 className="text-3xl font-bold tracking-tight">{module.label}</h1>
          <p className="text-sm text-muted-foreground">
            {moduleCfg?.description ?? `${visiblePages.length} section${visiblePages.length !== 1 ? "s" : ""} available`}
            {isMaster && (
              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-lg">Admin preview</span>
            )}
          </p>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* ── Section cards ───────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {visiblePages.length} section{visiblePages.length !== 1 ? "s" : ""} available
        </p>

        {/* Full-width grid — 3 columns on desktop, scales down */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiblePages.map((page) => {
            const pageKey  = page.key.split(".")[1];
            const pageCfg  = PAGE_CONFIG[page.key];
            const PageIcon = pageCfg?.icon ?? FileText;
            const desc     = pageCfg?.description;

            return (
              <Link
                key={page.id}
                href={ROUTES.staff.page(siteId, moduleKey, pageKey)}
                className="group relative flex flex-col gap-4 bg-card border border-border
                  rounded-2xl p-5 hover:border-foreground/20 hover:shadow-md
                  transition-all duration-200 overflow-hidden"
              >
                {/* Watermark icon */}
                <div className="absolute -right-3 -bottom-3 opacity-[0.04] pointer-events-none">
                  <PageIcon className="h-24 w-24" />
                </div>

                {/* Icon + arrow */}
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-foreground flex items-center
                    justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <PageIcon className="h-5 w-5 text-background" />
                  </div>
                  <div className="w-7 h-7 rounded-lg border border-border flex items-center
                    justify-center group-hover:border-foreground/30 group-hover:bg-muted/50
                    transition-all duration-200">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground
                      group-hover:text-foreground group-hover:translate-x-0.5
                      transition-all duration-200" />
                  </div>
                </div>

                {/* Text */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground leading-tight">
                    {page.label}
                  </h3>
                  {desc && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {desc}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
