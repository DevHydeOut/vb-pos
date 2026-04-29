// src/app/portal/[siteId]/settings/general/page.tsx

import { redirect }           from "next/navigation";
import { getMasterProfile }   from "@/data/master";
import { getStaffSession }    from "@/actions/auth/staff";
import { prisma }             from "@/lib/prisma";
import { notFound }           from "next/navigation";
import { ROUTES }             from "@/routes";
import { SiteSettingsClient } from "@/components/portal/settings/site-settings-client";
import { PageHeader } from "@/components/shared/page-header";

export default async function GeneralSettingsPage({
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

  const [site, masterProfile] = await Promise.all([
    prisma.site.findUnique({ where: { id: siteId } }),
    prisma.masterProfile.findUnique({
      where:  { id: masterProfileId },
      select: {
        currencyCode:   true,
        currencySymbol: true,
        phoneCode:      true,
        timezone:       true,
        dateFormat:     true,
      },
    }),
  ]);

  if (!site || !masterProfile) notFound();

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="text-2xl font-bold tracking-tight">General</h1>
      </div>
      <div className="border-t border-border" />
      <SiteSettingsClient
        site={{
          id:                    site.id,
          name:                  site.name,
          address:               site.address,
          phone:                 site.phone,
          currencyCode:          site.currencyCode,
          currencySymbol:        site.currencySymbol,
          phoneCode:             site.phoneCode,
          timezone:              site.timezone,
          dateFormat:            site.dateFormat,
          countryOverridden:     site.countryOverridden,
          taxInclusive:          site.taxInclusive,
          taxRegistrationNumber: site.taxRegistrationNumber ?? null,
          logoUrl:               site.logoUrl               ?? null,
          receiptFooter:         site.receiptFooter         ?? null,
          language:              site.language,
        }}
        masterLocale={masterProfile}   // always fetched — never undefined
      />
    </main>
  );
}