
import { redirect }                  from "next/navigation";
import { getMasterProfile }          from "@/data/master";
import { getStaffSession }           from "@/actions/auth/staff";
import { prisma }                    from "@/lib/prisma";
import { ROUTES }                    from "@/routes";
import { SiteLoyaltySettingsClient } from "@/components/portal/loyalty/site-loyalty-settings-client";

export async function PortalLoyaltySettingsPage({
  params,
}: { params: Promise<{ siteId: string }> }) {
  const { siteId }   = await params;
  const masterResult = await getMasterProfile().catch(() => null);
  const staffSession = await getStaffSession().catch(() => null);
  if (!masterResult && !staffSession) redirect(ROUTES.auth.login);

  const masterProfileId = masterResult
    ? masterResult.masterProfile.id
    : (await prisma.site.findUnique({ where: { id: siteId } }))!.masterProfileId;

  const [program, siteOverride, master] = await Promise.all([
    prisma.loyaltyProgram.findUnique({
      where:  { masterProfileId },
      select: { isEnabled: true, pointsPerUnit: true, unitValue: true, pointsName: true },
    }),
    prisma.loyaltyProgramSite.findUnique({
      where: { siteId },
    }),
    prisma.masterProfile.findUnique({ where: { id: masterProfileId } }),
  ]);

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="text-2xl font-bold tracking-tight">Loyalty Program</h1>
      </div>
      <div className="border-t border-border" />
      <SiteLoyaltySettingsClient
        siteId={siteId}
        masterProgram={program}
        siteOverride={siteOverride ? {
          isEnabled:    siteOverride.isEnabled,
          pointsPerUnit: siteOverride.pointsPerUnit,
          unitValue:    siteOverride.unitValue,
        } : null}
        currencySymbol={master?.currencySymbol ?? "$"}
      />
    </main>
  );
}

export default PortalLoyaltySettingsPage;