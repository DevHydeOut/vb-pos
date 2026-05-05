import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Boxes,
  FileText,
  LayoutGrid,
  Package,
  Receipt,
  SlidersHorizontal,
  Star,
  Users,
} from "lucide-react";
import { getStaffSession } from "@/actions/auth/staff";
import { getMasterProfile } from "@/data/master";
import { isCoreModule, isCorePage } from "@/config/app-modules";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";

const MODULE_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  inventory: { icon: Package, description: "Products, stock levels, stock entries, and site transfers." },
  billing: { icon: Receipt, description: "POS billing, item discounts, tax, royalty lookup, and sales analytics." },
  loyalty: { icon: Star, description: "Global customer points and rewards customers can claim from any site." },
};

const PAGE_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  "inventory.products": { icon: Boxes, description: "Add products, pricing, barcode, variants, and opening stock." },
  "inventory.stock": { icon: LayoutGrid, description: "View stock levels across products and variants." },
  "inventory.adjust": { icon: SlidersHorizontal, description: "Record stock-ins, write-offs, and corrections." },
  "inventory.transfers": { icon: ArrowLeftRight, description: "Move stock between sites." },
  "billing.pos": { icon: Receipt, description: "Create POS bills with customer phone, optional name, discounts, and points." },
  "billing.analytics": { icon: BarChart3, description: "Review basic sales, bills, discounts, stock, and royalty activity." },
  "loyalty.customers": { icon: Users, description: "See customers with global royalty points across all sites." },
  "loyalty.rewards": { icon: Star, description: "Create rewards and point-based coupons." },
};

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

  const module = await prisma.module.findUnique({
    where: { key: moduleKey },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!module) notFound();

  let visiblePages: typeof module.pages;

  if (isMaster) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult!.masterProfile.id, isActive: true },
    });
    if (!site) notFound();
    visiblePages = module.pages.filter((page) => isCorePage(page.key));
  } else {
    const subUserSite = await prisma.subUserSite.findUnique({
      where: { subUserId_siteId: { subUserId: staffSession!.subUser.id, siteId } },
      include: { site: true, permissions: { include: { module: true, page: true } } },
    });
    if (!subUserSite?.site.isActive) notFound();

    const hasFullAccess = subUserSite.permissions.some(
      (permission) => permission.module?.id === module.id && !permission.page
    );
    const allowedPageIds = subUserSite.permissions
      .filter((permission) => permission.module?.id === module.id && permission.page)
      .map((permission) => permission.page!.id);

    visiblePages = (hasFullAccess
      ? module.pages
      : module.pages.filter((page) => allowedPageIds.includes(page.id))
    ).filter((page) => isCorePage(page.key));

    if (visiblePages.length === 0) notFound();
  }

  const moduleCfg = MODULE_CONFIG[moduleKey];
  const ModuleIcon = moduleCfg?.icon ?? Package;

  return (
    <main className="min-h-full px-6 py-10 space-y-10">
      <div className="flex items-start gap-5">
        <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center shrink-0 mt-0.5">
          <ModuleIcon className="h-7 w-7 text-background" />
        </div>
        <div className="space-y-1 pt-1">
          <h1 className="text-3xl font-bold tracking-tight">{module.label}</h1>
          <p className="text-sm text-muted-foreground">
            {moduleCfg?.description ?? `${visiblePages.length} sections available`}
            {isMaster && <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-lg">Admin preview</span>}
          </p>
        </div>
      </div>

      <div className="border-t border-border" />

      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {visiblePages.length} section{visiblePages.length !== 1 ? "s" : ""} available
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiblePages.map((page) => {
            const pageKey = page.key.split(".")[1];
            const pageCfg = PAGE_CONFIG[page.key];
            const PageIcon = pageCfg?.icon ?? FileText;

            return (
              <Link
                key={page.id}
                href={ROUTES.staff.page(siteId, moduleKey, pageKey)}
                className="group relative flex flex-col gap-4 bg-card border border-border rounded-2xl p-5 hover:border-foreground/20 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="absolute -right-3 -bottom-3 opacity-[0.04] pointer-events-none">
                  <PageIcon className="h-24 w-24" />
                </div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PageIcon className="h-5 w-5 text-background" />
                  </div>
                  <div className="w-7 h-7 rounded-lg border border-border flex items-center justify-center group-hover:border-foreground/30 group-hover:bg-muted/50 transition-all">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground leading-tight">{page.label}</h3>
                  {pageCfg?.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {pageCfg.description}
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
