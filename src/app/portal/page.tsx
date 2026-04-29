import { redirect }       from "next/navigation";
import { getStaffSession } from "@/actions/auth/staff";
import { ROUTES }          from "@/routes";
import { SitePickerClient } from "@/components/staff/site-picker-client";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function PortalIndexPage() {
  const session = await getStaffSession();
  if (!session) redirect(ROUTES.auth.login);

  // Single site — skip picker entirely
  if (session.subUser.sites.length === 1) {
    redirect(ROUTES.staff.site(session.subUser.sites[0].siteId));
  }

  const firstName = (session.subUser.name ?? session.subUser.username).split(" ")[0];

  const sites = session.subUser.sites.map((s) => ({
    id:      s.site.id,
    name:    s.site.name,
    address: s.site.address,
    phone:   s.site.phone,
  }));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">

      {/* Grid background using theme border color */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-size-[3rem_3rem] opacity-50" />

      <div className="relative w-full max-w-md space-y-8">

        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            You have access to {sites.length} sites. Select one to continue.
          </p>
        </div>

        {/* Site cards */}
        <SitePickerClient sites={sites} />
      </div>
    </div>
  );
}