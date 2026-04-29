import { getStaffSession } from "@/actions/auth/staff";
import { ProductFormClient } from "@/components/portal/inventory/product-form-client";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
 
export async function PortalEditProductPage({
  params,
}: {
  params: Promise<{ siteId: string; productId: string }>;
}) {
  const { siteId, productId } = await params;
  const masterResult = await getMasterProfile().catch(() => null);
  const staffSession = await getStaffSession().catch(() => null);
  if (!masterResult && !staffSession) redirect(ROUTES.auth.login);
 
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) redirect(ROUTES.auth.login);
 
  const masterProfileId = masterResult?.masterProfile.id ?? site.masterProfileId;
 
  const [product, categories, taxGroups, master] = await Promise.all([
    prisma.product.findFirst({
      where:   { id: productId, masterProfileId, deletedAt: null },
      include: {
        images:   { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
    }),
prisma.category.findMany({
      where:   { masterProfileId, deletedAt: null, OR: [{ siteId }, { siteId: null }] },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, siteId: true },
    }),
    prisma.taxGroup.findMany({
      where:   { masterProfileId, deletedAt: null, isActive: true, OR: [{ siteId }, { siteId: null }] },
      orderBy: { rate: "asc" },
      select:  { id: true, name: true, rate: true },
    }),
    prisma.masterProfile.findUnique({ where: { id: masterProfileId } }),
  ]);
 
  if (!product) notFound();
 
  return (
    <main className="px-6 py-10 max-w-3xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Products</p>
        <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
      </div>
      <div className="border-t border-border" />
      <ProductFormClient
        product={{
          ...product,
          categoryId: product.categoryId ?? null,
          taxGroupId: product.taxGroupId ?? null,
        }}
        categories={categories}
        taxGroups={taxGroups}
        siteId={siteId}
        masterProfileId={masterProfileId}
        currencySymbol={master?.currencySymbol ?? site.currencySymbol}
        backUrl={`/portal/${siteId}/inventory/products`}
      />
    </main>
  );
}
 
export default PortalEditProductPage;