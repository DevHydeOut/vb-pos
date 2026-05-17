import { ProductFormClient } from "@/components/portal/inventory/product-form-client";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { redirect, notFound } from "next/navigation";

async function ManageEditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);
  const { masterProfile } = result;
 
  const [product, categories, taxGroups] = await Promise.all([
    prisma.product.findFirst({
      where:   { id: productId, masterProfileId: masterProfile.id, siteId: null, deletedAt: null },
      include: {
        images:   { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.category.findMany({
      where:   { masterProfileId: masterProfile.id, siteId: null, deletedAt: null },
      orderBy: { name: "asc" },
      select:  { id: true, name: true },
    }),
    prisma.taxGroup.findMany({
      where:   { masterProfileId: masterProfile.id, siteId: null, deletedAt: null, isActive: true },
      orderBy: { rate: "asc" },
      select:  { id: true, name: true, rate: true },
    }),
  ]);
 
  if (!product) notFound();
 
  return (
    <main className="px-6 py-10 max-w-3xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Manage / Products</p>
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
        siteId={null}
        masterProfileId={masterProfile.id}
        currencySymbol={masterProfile.currencySymbol}
        backUrl="/dashboard/manage/products"
      />
    </main>
  );
}
 
export default ManageEditProductPage;
