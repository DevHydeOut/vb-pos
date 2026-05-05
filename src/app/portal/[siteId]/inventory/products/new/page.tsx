import { notFound, redirect } from "next/navigation";
import { ProductFormClient } from "@/components/portal/inventory/product-form-client";
import { getMasterProfile } from "@/data/master";
import { getStaffSession } from "@/actions/auth/staff";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";

async function resolveAccess(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult.masterProfile.id, isActive: true },
      select: { id: true },
    });
    if (!site) notFound();
    return {
      masterProfileId: masterResult.masterProfile.id,
      currencySymbol: masterResult.masterProfile.currencySymbol,
    };
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

  return {
    masterProfileId: subUserSite.site.masterProfileId,
    currencySymbol: subUserSite.site.currencySymbol,
  };
}

export default async function NewSiteProductPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const access = await resolveAccess(siteId);

  const [categories, taxGroups] = await Promise.all([
    prisma.category.findMany({
      where: {
        masterProfileId: access.masterProfileId,
        deletedAt: null,
        OR: [{ siteId }, { siteId: null }, { isGlobal: true }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.taxGroup.findMany({
      where: {
        masterProfileId: access.masterProfileId,
        deletedAt: null,
        isActive: true,
        OR: [{ siteId }, { siteId: null }, { isGlobal: true }],
      },
      orderBy: { rate: "asc" },
      select: { id: true, name: true, rate: true },
    }),
  ]);

  return (
    <main className="px-6 py-10 max-w-3xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Stock Management / Products</p>
        <h1 className="text-3xl font-bold tracking-tight">New Product</h1>
      </div>
      <div className="border-t border-border" />
      <ProductFormClient
        categories={categories}
        taxGroups={taxGroups}
        siteId={siteId}
        masterProfileId={access.masterProfileId}
        currencySymbol={access.currencySymbol}
        backUrl={ROUTES.staff.inventory.products(siteId)}
      />
    </main>
  );
}
