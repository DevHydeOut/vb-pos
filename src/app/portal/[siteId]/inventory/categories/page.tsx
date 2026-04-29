// src/app/portal/[siteId]/inventory/categories/page.tsx

import { redirect, notFound }    from "next/navigation";
import { getStaffSession }       from "@/actions/auth/staff";
import { getMasterProfile }      from "@/data/master";
import { prisma }                from "@/lib/prisma";
import { ROUTES }                from "@/routes";
import { CategoryListClient }    from "@/components/portal/inventory/category-list-client";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId }   = await params;
  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);
  if (!staffSession && !masterResult) redirect(ROUTES.auth.login);

  const isMaster = !!masterResult && !staffSession;

  let masterProfileId: string;

  if (isMaster) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult!.masterProfile.id },
    });
    if (!site) notFound();
    masterProfileId = masterResult!.masterProfile.id;
  } else {
    const subUserSite = await prisma.subUserSite.findUnique({
      where:   { subUserId_siteId: { subUserId: staffSession!.subUser.id, siteId } },
      include: { site: true },
    });
    if (!subUserSite || !subUserSite.site.isActive) notFound();
    masterProfileId = subUserSite.site.masterProfileId;
  }

  const [site, categories, allSites] = await Promise.all([
    prisma.site.findUnique({ where: { id: siteId } }),
    prisma.category.findMany({
      where:   { siteId, deletedAt: null },
      include: { type: true },
      orderBy: { createdAt: "desc" },
    }),
    isMaster
      ? prisma.site.findMany({
          where:   { masterProfileId, isActive: true, id: { not: siteId } },
          orderBy: { name: "asc" },
          select:  { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  if (!site) notFound();

  return (
    // CategoryListClient accepts: siteId, siteName, isMaster, categories, allSites (optional)
    // It does NOT accept categoryTypes — types are derived from categories internally
    <CategoryListClient
      siteId={siteId}
      siteName={site.name}
      isMaster={isMaster}
      categories={categories}
      allSites={allSites}
    />
  );
}