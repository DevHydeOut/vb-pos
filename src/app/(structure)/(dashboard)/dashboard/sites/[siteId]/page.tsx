import { getSite }         from "@/data/site";
import { prisma }           from "@/lib/prisma";
import { ROUTES }           from "@/routes";
import { PageHeader }       from "@/components/dashboard/page-header";
import { SiteDetailClient } from "@/components/dashboard/sites/site-detail-client";
import { Button }           from "@/components/ui/button";
import Link                 from "next/link";
import { ArrowLeft }        from "lucide-react";
import { isCorePage }       from "@/config/app-modules";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { site }   = await getSite(siteId);

  const [staffCount, modules, staffList] = await Promise.all([
    prisma.subUserSite.count({ where: { siteId } }),
    prisma.module.findMany({
      where: { key: { in: ["inventory", "billing", "loyalty"] } },
      orderBy: { sortOrder: "asc" },
      include: { pages: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.subUserSite.findMany({
      where:   { siteId },
      include: { subUser: { select: { id: true, name: true, username: true } } },
      take:    10,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const recentStaff = staffList.map((sus) => sus.subUser);

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title={site.name}
        description={site.address ?? "No address on file"}
        backButton={
          <Button variant="ghost" size="icon" asChild>
            <Link href={ROUTES.dashboard.sites}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
        action={
          <Button asChild size="lg">
            <Link href={ROUTES.staff.site(siteId)} target="_blank" rel="noopener">
              Enter Site ↗
            </Link>
          </Button>
        }
      />

      <SiteDetailClient
        site={site}
        staffCount={staffCount}
        recentStaff={recentStaff}
        modules={modules.map((module) => ({
          ...module,
          pages: module.pages.filter((page) => isCorePage(page.key)),
        }))}
        siteId={siteId}
      />
    </div>
  );
}
