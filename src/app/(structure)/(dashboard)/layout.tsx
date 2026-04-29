import { getMasterProfile } from "@/data/master";
import { getSites }         from "@/data/site";
import { redirect }         from "next/navigation";
import { ROUTES }           from "@/routes";
import { DashboardSidebar }  from "@/components/dashboard/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (!masterResult) redirect(ROUTES.auth.login);

  const { sites } = await getSites();

  const { masterProfile, session } = masterResult;

  return (
    <div className="flex min-h-screen bg-background">

      {/* Sidebar */}
      <DashboardSidebar
        accountId={masterProfile.accountId}
        userName={session.user.name  ?? "Owner"}
        userEmail={session.user.email ?? ""}
        userImage={session.user.image ?? null}
        sites={sites.map((s) => ({ id: s.id, name: s.name }))}
      />

      {/* Main content — offset by sidebar width */}
      <main className="flex-1 ml-72 min-h-screen">
        {children}
      </main>

    </div>
  );
}