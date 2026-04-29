import { redirect }             from "next/navigation";
import { getMasterProfile }     from "@/data/master";
import { prisma }               from "@/lib/prisma";
import { ROUTES }               from "@/routes";
import { MasterProfileClient }  from "@/components/dashboard/master-profile-client";

export default async function MasterProfilePage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);

  const profile = await prisma.masterProfile.findUnique({
    where: { id: result.masterProfile.id },
  });
  if (!profile) redirect(ROUTES.auth.login);

  return (
    <main className="px-6 py-10 max-w-3xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Business Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your business details and locale settings. These cascade to all new sites.
        </p>
      </div>
      <div className="border-t border-border" />
      <MasterProfileClient
        profile={{
          businessName:          profile.businessName,
          businessLogoUrl:       profile.businessLogoUrl,
          taxRegistrationNumber: profile.taxRegistrationNumber,
          countryCode:           profile.countryCode,
          currencyCode:          profile.currencyCode,
          currencySymbol:        profile.currencySymbol,
          phoneCode:             profile.phoneCode,
          timezone:              profile.timezone,
          dateFormat:            profile.dateFormat,
          phone:                 profile.phone,
          profileComplete:       profile.profileComplete,
        }}
      />
    </main>
  );
}
