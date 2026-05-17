import { redirect }         from "next/navigation";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { prisma }           from "@/lib/prisma";
import { ROUTES }           from "@/routes";
import { StockLevelsClient } from "@/components/portal/inventory/stock-levels-client";
 
export default async function StockLevelsPage({
  params,
}: { params: Promise<{ siteId: string }> }) {
  const { siteId }   = await params;
  const masterResult = await getMasterProfile().catch(() => null);
  const staffSession = await getStaffSession().catch(() => null);
  if (!masterResult && !staffSession) redirect(ROUTES.auth.login);

  let masterProfileId: string;
  if (masterResult) {
    const siteAccess = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult.masterProfile.id, isActive: true },
      select: { masterProfileId: true },
    });
    if (!siteAccess) redirect(ROUTES.auth.login);
    masterProfileId = siteAccess.masterProfileId;
  } else {
    const siteAccess = await prisma.subUserSite.findUnique({
      where: { subUserId_siteId: { subUserId: staffSession!.subUserId, siteId } },
      include: { site: { select: { masterProfileId: true, isActive: true } }, permissions: { include: { module: true, page: true } } },
    });
    const canViewStock = siteAccess?.site.isActive && siteAccess.permissions.some(
      (permission) =>
        (permission.module?.key === "inventory" && !permission.page) ||
        permission.page?.key === "inventory.stock"
    );
    if (!siteAccess || !canViewStock) redirect(ROUTES.auth.login);
    masterProfileId = siteAccess.site.masterProfileId;
  }
 
  const [products, master] = await Promise.all([
    prisma.product.findMany({
      where: {
        masterProfileId,
        deletedAt: null,
        isActive:  true,
        OR: [{ siteId }, { siteId: null }],
      },
      include: {
        variants: { where: { deletedAt: null, isActive: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.masterProfile.findUnique({ where: { id: masterProfileId } }),
  ]);
 
  const enriched = products.map((p) => {
    const totalStock = p.hasVariants
      ? p.variants.reduce((s, v) => s + v.stock, 0)
      : p.stock;
    const threshold = p.lowStockThreshold ?? 5;
    const status: "ok" | "low" | "out" =
      totalStock === 0       ? "out" :
      totalStock <= threshold ? "low" : "ok";
    return {
      id:           p.id,
      name:         p.name,
      sku:          p.sku,
      hasVariants:  p.hasVariants,
      stock:        p.stock,
      totalStock,
      threshold,
      status,
      category:     p.category,
      variants:     p.variants.map((v) => ({
        id:    v.id,
        name:  v.name,
        stock: v.stock,
        sku:   v.sku,
      })),
    };
  });
 
  return (
    <main className="px-4 py-8 max-w-4xl mx-auto">
      <StockLevelsClient
        products={enriched}
        siteId={siteId}
        currencySymbol={master?.currencySymbol ?? "$"}
      />
    </main>
  );
}
