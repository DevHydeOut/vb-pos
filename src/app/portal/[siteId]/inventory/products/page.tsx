import { redirect }           from "next/navigation";
import { getMasterProfile }   from "@/data/master";
import { getStaffSession }    from "@/actions/auth/staff";
import { prisma }             from "@/lib/prisma";
import { ROUTES }             from "@/routes";
import { ProductListClient }  from "@/components/portal/inventory/product-list-client";
import { PageHeader } from "@/components/shared/page-header";
 
export default async function ProductsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId }   = await params;
  const masterResult = await getMasterProfile().catch(() => null);
  const staffSession = await getStaffSession().catch(() => null);
  if (!masterResult && !staffSession) redirect(ROUTES.auth.login);
 
  const masterProfileId = masterResult
    ? masterResult.masterProfile.id
    : (await prisma.site.findUnique({ where: { id: siteId } }))!.masterProfileId;
 
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) redirect(ROUTES.auth.login);
 
  const [products, categories, allSites] = await Promise.all([
    prisma.product.findMany({
      where:   { siteId, masterProfileId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        taxGroup: { select: { id: true, name: true } },
        images:   { orderBy: { sortOrder: "asc" } },
        variants: {
          where:   { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
prisma.category.findMany({
      where:   { masterProfileId, deletedAt: null, OR: [{ siteId }, { siteId: null }] },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, siteId: true },
    }),
    masterResult
      ? prisma.site.findMany({
          where:   { masterProfileId, isActive: true },
          orderBy: { name: "asc" },
          select:  { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
 
  return (
    <main className="px-6 py-10 max-w-6xl space-y-8">
      <PageHeader title="Products" description="Manage products for {site.name}." />
      <div className="border-t border-border" />
      <ProductListClient
        products={products}
        allSites={allSites}
        categories={categories}
        siteId={siteId}
        siteName={site.name}
        isMaster={!!masterResult}
      />
    </main>
  );
}