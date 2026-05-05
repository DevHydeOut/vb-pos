// src/app/(structure)/portal/[siteId]/[moduleKey]/[pageKey]/page.tsx
// Central dispatcher — routes every module.page key to its real component.
// Import paths match the ACTUAL file structure (portal/[siteId]/... not (structure)/portal/...)

import { redirect, notFound } from "next/navigation";
import { getStaffSession }    from "@/actions/auth/staff";
import { getMasterProfile }   from "@/data/master";
import { prisma }             from "@/lib/prisma";
import { ROUTES }             from "@/routes";
import { Construction }       from "lucide-react";

/* ── Real page imports (paths match actual on-disk files) ────── */

import ProductsPage        from "@/app/portal/[siteId]/inventory/products/page";
import StockPage           from "@/app/portal/[siteId]/inventory/stock/page";
import AdjustPage          from "@/app/portal/[siteId]/inventory/adjust/page";
import TransfersPage       from "@/app/portal/[siteId]/inventory/transfers/page";
import BillingPosPage      from "@/app/portal/[siteId]/billing/pos/page";
import BillingAnalyticsPage from "@/app/portal/[siteId]/billing/analytics/page";
import CustomerLoyaltyPage from "@/app/portal/[siteId]/loyalty/customers/page";
import LoyaltyRewardsPage  from "@/app/portal/[siteId]/loyalty/rewards/page";
import { isCoreModule, isCorePage } from "@/config/app-modules";

type PageProps = {
  params: Promise<{ siteId: string; moduleKey: string; pageKey: string }>;
};

async function checkAccess(siteId: string, moduleKey: string, pageKey: string) {
  const fullKey      = `${moduleKey}.${pageKey}`;
  if (!isCoreModule(moduleKey) || !isCorePage(fullKey)) notFound();
  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);
  if (!staffSession && !masterResult) redirect(ROUTES.auth.login);

  const isMaster = !!masterResult && !staffSession;
  const [module, page] = await Promise.all([
    prisma.module.findUnique({ where: { key: moduleKey } }),
    prisma.page.findUnique({ where: { key: fullKey } }),
  ]);
  if (!module || !page) notFound();

  if (isMaster) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult!.masterProfile.id },
    });
    if (!site || !site.isActive) notFound();
  } else {
    const subUserSite = await prisma.subUserSite.findUnique({
      where:   { subUserId_siteId: { subUserId: staffSession!.subUser.id, siteId } },
      include: { site: true, permissions: { include: { module: true, page: true } } },
    });
    if (!subUserSite || !subUserSite.site.isActive) notFound();
    const hasAccess =
      subUserSite.permissions.some((p) => p.module?.id === module.id && !p.page) ||
      subUserSite.permissions.some((p) => p.page?.id === page.id);
    if (!hasAccess) notFound();
  }
}

export default async function PageDispatcher({ params }: PageProps) {
  const { siteId, moduleKey, pageKey } = await params;
  const fullKey  = `${moduleKey}.${pageKey}`;
  await checkAccess(siteId, moduleKey, pageKey);
  const siteParams = Promise.resolve({ siteId });

  switch (fullKey) {
    case "inventory.products":    return <ProductsPage        params={siteParams} />;
    case "inventory.stock":       return <StockPage           params={siteParams} />;
    case "inventory.adjust":      return <AdjustPage          params={siteParams} />;
    case "inventory.transfers":   return <TransfersPage       params={siteParams} />;
    case "billing.pos":           return <BillingPosPage      params={siteParams} />;
    case "billing.analytics":     return <BillingAnalyticsPage params={siteParams} />;
    case "loyalty.customers":     return <CustomerLoyaltyPage params={siteParams} />;
    case "loyalty.rewards":       return <LoyaltyRewardsPage  params={siteParams} />;
    default:                      return <ComingSoon pageKey={fullKey} />;
  }
}

function ComingSoon({ pageKey }: { pageKey: string }) {
  const label = pageKey.split(".").pop() ?? pageKey;
  return (
    <main className="px-4 py-16 flex flex-col items-center justify-center gap-5 text-center pb-24">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold capitalize">{label}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          This page is being built and will be available shortly.
        </p>
        <p className="text-xs text-muted-foreground font-mono mt-2 opacity-50">{pageKey}</p>
      </div>
    </main>
  );
}
