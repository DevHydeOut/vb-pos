import { ProductListClient } from "@/components/portal/inventory/product-list-client";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { redirect } from "next/navigation";
async function ManageProductsPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);
  const { masterProfile } = result;
 
  const [products, categories, allSites] = await Promise.all([
    prisma.product.findMany({
      where:   { masterProfileId: masterProfile.id, siteId: null, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        taxGroup: { select: { id: true, name: true } },
        images:   { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where:   { masterProfileId: masterProfile.id, siteId: null, deletedAt: null },
      orderBy: { name: "asc" },
      select:  { id: true, name: true },
    }),
    prisma.site.findMany({
      where:   { masterProfileId: masterProfile.id, isActive: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true },
    }),
  ]);
 
  return (
    <main className="px-6 py-10 max-w-6xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Manage</p>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">
          Global products. Create once and push to any site.
        </p>
      </div>
      <div className="border-t border-border" />
      <ProductListClient
        products={products}
        allSites={allSites}
        categories={categories}
        siteId={null}
        siteName="Global"
        isMaster={true}
      />
    </main>
  );
}
 
export default ManageProductsPage;
