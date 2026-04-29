 
import { redirect }              from "next/navigation";
import { getMasterProfile }      from "@/data/master";
import { prisma }                from "@/lib/prisma";
import { ROUTES }                from "@/routes";
import { LoyaltySettingsClient } from "@/components/dashboard/loyalty/loyalty-settings-client";
import { PageHeader } from "@/components/dashboard/page-header";
 
export default async function LoyaltySettingsPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);
  const { masterProfile } = result;
 
  const [program, sites] = await Promise.all([
    prisma.loyaltyProgram.findUnique({
      where:   { masterProfileId: masterProfile.id },
      include: {
        siteOverrides: { include: { site: { select: { id: true, name: true } } } },
      },
    }),
    prisma.site.findMany({
      where:   { masterProfileId: masterProfile.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);
 
  return (
    <main className="px-6 py-10 max-w-3xl space-y-8">
      <div className="space-y-1">
        <PageHeader title="Loyalty Program" description="Configure how customers earn points across your business." />
      </div>
      <div className="border-t border-border" />
      <LoyaltySettingsClient
        program={program ? {
          isEnabled:     program.isEnabled,
          pointsPerUnit: program.pointsPerUnit,
          unitValue:     program.unitValue,
          pointsName:    program.pointsName,
          expiryDays:    program.expiryDays,
          siteOverrides: program.siteOverrides.map((o) => ({
            siteId:       o.siteId,
            siteName:     o.site.name,
            isEnabled:    o.isEnabled,
            pointsPerUnit: o.pointsPerUnit,
            unitValue:    o.unitValue,
          })),
        } : null}
        sites={sites.map((s) => ({ id: s.id, name: s.name }))}
        currencySymbol={masterProfile.currencySymbol ?? "$"}
      />
    </main>
  );
}