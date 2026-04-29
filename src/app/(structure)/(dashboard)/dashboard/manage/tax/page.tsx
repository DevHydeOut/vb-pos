import { TaxGroupListClient } from "@/components/portal/settings/tax-group-list-client";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { redirect } from "next/navigation";

export async function ManageTaxPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);
  const { masterProfile } = result;

  const [taxGroups, allSites] = await Promise.all([
    prisma.taxGroup.findMany({
      where:   { masterProfileId: masterProfile.id, siteId: null, deletedAt: null },
      orderBy: { rate: "asc" },
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
        <h1 className="text-3xl font-bold tracking-tight">Tax Groups</h1>
        <p className="text-sm text-muted-foreground">
          Define global tax rates. Push to sites or let sites configure their own.
        </p>
      </div>
      <div className="border-t border-border" />
      <TaxGroupListClient
        taxGroups={taxGroups}
        allSites={allSites.map((s) => ({ id: s.id, name: s.name }))}
        siteId={null}
        isMaster={true}
      />
    </main>
  );
}

export default ManageTaxPage;