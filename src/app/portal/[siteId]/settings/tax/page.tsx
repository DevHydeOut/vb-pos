// src/app/portal/[siteId]/settings/tax/page.tsx

import { redirect }           from "next/navigation";
import { getStaffSession }    from "@/actions/auth/staff";
import { getMasterProfile }   from "@/data/master";
import { prisma }             from "@/lib/prisma";
import { ROUTES }             from "@/routes";
import { TaxGroupListClient } from "@/components/portal/settings/tax-group-list-client";
import { PageHeader } from "@/components/shared/page-header";

export default async function TaxGroupPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId }   = await params;
  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);
  if (!staffSession && !masterResult) redirect(ROUTES.auth.login);

  const isMaster        = !!masterResult && !staffSession;
  const masterProfileId = isMaster
    ? masterResult!.masterProfile.id
    : (await prisma.site.findFirst({ where: { id: siteId } }))?.masterProfileId ?? "";

  const [taxGroups, allSites] = await Promise.all([
    prisma.taxGroup.findMany({
      where:   { siteId, masterProfileId, deletedAt: null },
      orderBy: { rate: "asc" },
    }),
    isMaster
      ? prisma.site.findMany({
          where:   { masterProfileId, isActive: true, id: { not: siteId } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="px-6 py-10 max-w-5xl space-y-8">
      <PageHeader title="Tax Rates" description="Configure tax rates for your products" />
      <div className="border-t border-border" />
      <TaxGroupListClient
        taxGroups={taxGroups}
        allSites={allSites.map((s) => ({ id: s.id, name: s.name }))}
        siteId={siteId}
        isMaster={isMaster}
      />
    </main>
  );
}