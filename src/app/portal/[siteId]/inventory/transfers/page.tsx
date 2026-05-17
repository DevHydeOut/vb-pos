// src/app/portal/[siteId]/inventory/transfers/page.tsx

import { notFound }         from "next/navigation";
import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { StockTransferListClient } from "@/components/portal/inventory/stock-transfer-list-client";
import { PageHeader } from "@/components/shared/page-header";

async function resolveIdentity(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult.masterProfile.id, isActive: true },
    });
    if (!site) return null;
    return { masterProfileId: masterResult.masterProfile.id, isMaster: true };
  }
  const staffSession = await getStaffSession().catch(() => null);
  if (staffSession) {
    const subUserSite = await prisma.subUserSite.findUnique({
      where: { subUserId_siteId: { subUserId: staffSession.subUserId, siteId } },
      include: { site: true, permissions: { include: { module: true, page: true } } },
    });
    if (!subUserSite?.site.isActive) return null;
    const canTransfer = subUserSite.permissions.some(
      (permission) =>
        (permission.module?.key === "inventory" && !permission.page) ||
        permission.page?.key === "inventory.transfers"
    );
    if (!canTransfer) return null;
    return { masterProfileId: subUserSite.site.masterProfileId, isMaster: false };
  }
  return null;
}

export default async function StockTransfersPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const identity   = await resolveIdentity(siteId);
  if (!identity) notFound();

  const [site, transfers] = await Promise.all([
    prisma.site.findFirst({ where: { id: siteId, masterProfileId: identity.masterProfileId, isActive: true } }),
    prisma.stockTransfer.findMany({
      where: {
        masterProfileId: identity.masterProfileId,
        OR: [{ fromSiteId: siteId }, { toSiteId: siteId }],
      },
      include: {
        fromSite: { select: { id: true, name: true } },
        toSite:   { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!site) notFound();

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <PageHeader title="Stock Transfers" description={site.name} />
      </div>
      <StockTransferListClient
        siteId={siteId}
        transfers={transfers}
        currency={site.currencySymbol}
      />
    </div>
  );
}
