// src/app/portal/[siteId]/inventory/transfers/new/page.tsx

import { notFound }         from "next/navigation";
import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { StockTransferNewClient } from "@/components/portal/inventory/stock-transfer-new-client";
import { PageHeader } from "@/components/shared/page-header";

async function resolveIdentity(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) return { masterProfileId: masterResult.masterProfile.id, isMaster: true };
  const staffSession = await getStaffSession().catch(() => null);
  if (staffSession) {
    const site = await prisma.site.findFirst({ where: { id: siteId } });
    if (!site) return null;
    return { masterProfileId: site.masterProfileId, isMaster: false };
  }
  return null;
}

export default async function StockTransferNewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const identity   = await resolveIdentity(siteId);
  if (!identity) notFound();

  const [site, allSites, products] = await Promise.all([
    prisma.site.findFirst({ where: { id: siteId, isActive: true } }),
    prisma.site.findMany({
      where: {
        masterProfileId: identity.masterProfileId,
        isActive:        true,
        id:              { not: siteId },
      },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: {
        masterProfileId: identity.masterProfileId,
        isActive:        true,
        deletedAt:       null,
        OR: [{ isGlobal: true }, { siteId }],
      },
      include: {
        variants: { where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } },
        images:   { take: 1, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!site) notFound();

  const clientProducts = products.map((p) => ({
    id:          p.id,
    name:        p.name,
    sku:         p.sku,
    barcode:     p.barcode,
    costPrice:   p.costPrice,
    stock:       p.stock,
    hasVariants: p.hasVariants,
    images:      p.images.map((i) => ({ url: i.url })),
    variants:    p.variants.map((v) => ({
      id:        v.id,
      name:      v.name,
      sku:       v.sku,
      barcode:   v.barcode,
      costPrice: v.costPrice,
      stock:     v.stock,
    })),
  }));

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <PageHeader title="New Transfer" description={`Send stock from ${site.name} to another site`} />
      </div>
      <StockTransferNewClient
        siteId={siteId}
        siteName={site.name}
        otherSites={allSites}
        products={clientProducts}
        currency={site.currencySymbol}
      />
    </div>
  );
}
