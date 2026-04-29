import { redirect }            from "next/navigation";
import { getMasterProfile }    from "@/data/master";
import { prisma }              from "@/lib/prisma";
import { ROUTES }              from "@/routes";
import { CategoryListClient }  from "@/components/portal/inventory/category-list-client";

export default async function ManageCategoriesPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);
  const { masterProfile } = result;

  const [categories, allSites] = await Promise.all([
    prisma.category.findMany({
      where:   { masterProfileId: masterProfile.id, siteId: null, deletedAt: null },
      include: { type: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.site.findMany({
      where:   { masterProfileId: masterProfile.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="px-6 py-10 max-w-5xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Manage</p>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Global categories shared across all sites. Push to individual sites as needed.
        </p>
      </div>
      <div className="border-t border-border" />
      <CategoryListClient
        categories={categories}
        allSites={allSites.map((s) => ({ id: s.id, name: s.name }))}
        siteId={null}
        siteName="Global"
        isMaster={true}
      />
    </main>
  );
}