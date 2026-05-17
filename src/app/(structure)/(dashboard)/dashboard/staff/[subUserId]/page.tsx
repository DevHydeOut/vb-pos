import { getMasterProfile }   from "@/data/master";
import { prisma }              from "@/lib/prisma";
import { notFound }            from "next/navigation";
import { ROUTES }              from "@/routes";
import Link                    from "next/link";
import { Button }              from "@/components/ui/button";
import { PageHeader }          from "@/components/dashboard/page-header";
import { ArrowLeft }           from "lucide-react";
import { StaffDetailClient }   from "@/components/staff/staff-detail-client";
import { isCorePage }          from "@/config/app-modules";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ subUserId: string }>;
}) {
  const { subUserId }     = await params;
  const { masterProfile } = await getMasterProfile();

  const subUser = await prisma.subUser.findFirst({
    where: { id: subUserId, masterProfileId: masterProfile.id },
    include: {
      sites: {
        include: {
          site: true,
          permissions: {
            include: { module: true, page: true },
          },
        },
      },
    },
  });

  if (!subUser) notFound();

  const allSites = await prisma.site.findMany({
    where:   { masterProfileId: masterProfile.id },
    orderBy: { name: "asc" },
  });

  const modules = await prisma.module.findMany({
    where: { key: { in: ["inventory", "billing", "loyalty"] } },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title={subUser.name ?? subUser.username}
        description={`@${subUser.username}`}
        backButton={
          <Button variant="ghost" size="icon" asChild>
            <Link href={ROUTES.dashboard.staff}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <StaffDetailClient
        subUser={{
          id:       subUser.id,
          name:     subUser.name,
          description: subUser.description,
          username: subUser.username,
          isActive: subUser.isActive,
          sites:    subUser.sites.map((s) => ({
            siteId: s.siteId,
            site:   s.site,
            permissions: s.permissions.map((p) => ({
              module: p.module ? { id: p.module.id, label: p.module.label } : null,
              page:   p.page   ? { id: p.page.id,   label: p.page.label   } : null,
            })),
          })),
        }}
        allSites={allSites}
        modules={modules.map((module) => ({
          ...module,
          pages: module.pages.filter((page) => isCorePage(page.key)),
        }))}
      />
    </div>
  );
}
