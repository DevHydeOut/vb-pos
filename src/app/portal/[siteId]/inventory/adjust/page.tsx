// src/app/portal/[siteId]/inventory/adjust/page.tsx

import { notFound }         from "next/navigation";
import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { StockEntryClient } from "@/components/portal/inventory/stock-entry-client";

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

export default async function StockAdjustPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const identity   = await resolveIdentity(siteId);
  if (!identity) notFound();

  const [site, products, recentMovements] = await Promise.all([
    prisma.site.findFirst({ where: { id: siteId, isActive: true } }),
    prisma.product.findMany({
      where: {
        masterProfileId: identity.masterProfileId,
        isActive:        true,
        deletedAt:       null,
        OR: [{ isGlobal: true }, { siteId }],
      },
      include: {
        category: { select: { name: true } },
        variants: { where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } },
        images:   { take: 1, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    // Last 20 distinct products touched in stock movements for this site
    prisma.stockMovement.findMany({
      where:   { siteId },
      select:  { productId: true },
      orderBy: { createdAt: "desc" },
      take:    100, // over-fetch to get 20 distinct
    }),
  ]);

  if (!site) notFound();

  // Deduplicate to get last 20 distinct product IDs
  const seen = new Set<string>();
  const recentProductIds: string[] = [];
  for (const m of recentMovements) {
    if (!seen.has(m.productId)) {
      seen.add(m.productId);
      recentProductIds.push(m.productId);
      if (recentProductIds.length >= 20) break;
    }
  }

  const clientProducts = products.map((p) => ({
    id:           p.id,
    name:         p.name,
    sku:          p.sku,
    barcode:      p.barcode,
    costPrice:    p.costPrice,
    sellingPrice: p.sellingPrice,
    stock:        p.stock,
    hasVariants:  p.hasVariants,
    category:     p.category ? { name: p.category.name } : null,
    images:       p.images.map((i) => ({ url: i.url })),
    variants:     p.variants.map((v) => ({
      id:           v.id,
      name:         v.name,
      sku:          v.sku,
      barcode:      v.barcode,
      costPrice:    v.costPrice,
      sellingPrice: v.sellingPrice,
      stock:        v.stock,
    })),
  }));

  const siteInfo = {
    id:                    site.id,
    name:                  site.name,
    address:               site.address ?? null,
    phone:                 site.phone   ?? null,
    currencySymbol:        site.currencySymbol,
    taxRegistrationNumber: site.taxRegistrationNumber ?? null,
    taxInclusive:          site.taxInclusive,
    logoUrl:               site.logoUrl ?? null,
    receiptFooter:         site.receiptFooter ?? null,
  };

  return (
    <StockEntryClient
      siteId={siteId}
      site={siteInfo}
      products={clientProducts}
      timezone={site.timezone}
      recentProductIds={recentProductIds}
    />
  );
}