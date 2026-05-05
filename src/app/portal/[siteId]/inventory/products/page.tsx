import { notFound, redirect } from "next/navigation";
import { ProductListClient } from "@/components/portal/inventory/product-list-client";
import { getMasterProfile } from "@/data/master";
import { getStaffSession } from "@/actions/auth/staff";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";

async function resolveAccess(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult.masterProfile.id, isActive: true },
      select: { id: true, name: true, masterProfileId: true },
    });
    if (!site) notFound();
    return { masterProfileId: masterResult.masterProfile.id, siteName: site.name, isMaster: true };
  }

  const staffSession = await getStaffSession().catch(() => null);
  if (!staffSession) redirect(ROUTES.auth.login);

  const subUserSite = await prisma.subUserSite.findUnique({
    where: { subUserId_siteId: { subUserId: staffSession.subUserId, siteId } },
    include: { site: true, permissions: { include: { module: true, page: true } } },
  });
  if (!subUserSite?.site.isActive) notFound();

  const canManageProducts = subUserSite.permissions.some(
    (permission) =>
      (permission.module?.key === "inventory" && !permission.page) ||
      permission.page?.key === "inventory.products"
  );
  if (!canManageProducts) notFound();

  return { masterProfileId: subUserSite.site.masterProfileId, siteName: subUserSite.site.name, isMaster: false };
}

export default async function SiteProductsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const access = await resolveAccess(siteId);

  const [products, categories, allSites] = await Promise.all([
    prisma.product.findMany({
      where: {
        masterProfileId: access.masterProfileId,
        deletedAt: null,
        OR: [{ siteId }, { siteId: null, isGlobal: true }],
      },
      include: {
        category: { select: { id: true, name: true } },
        taxGroup: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: {
        masterProfileId: access.masterProfileId,
        deletedAt: null,
        OR: [{ siteId }, { siteId: null }, { isGlobal: true }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.site.findMany({
      where: { masterProfileId: access.masterProfileId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="px-6 py-10 max-w-6xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Stock Management</p>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">
          Add products for {access.siteName}; global products are available for billing but editable by admin.
        </p>
      </div>
      <div className="border-t border-border" />
      <ProductListClient
        products={products}
        allSites={allSites}
        categories={categories}
        siteId={siteId}
        siteName={access.siteName}
        isMaster={access.isMaster}
      />
    </main>
  );
}
