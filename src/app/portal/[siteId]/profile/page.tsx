import { SubUserProfileClient } from "@/components/portal/sub-user-profile-client";
import { getStaffSession }      from "@/actions/auth/staff";
import { prisma }               from "@/lib/prisma";
import { redirect }             from "next/navigation";
import { ROUTES }               from "@/routes";

export async function SubUserProfilePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId }   = await params;
  const staffSession = await getStaffSession().catch(() => null);
  if (!staffSession) redirect(ROUTES.auth.login);

  const subUser = await prisma.subUser.findUnique({
    where: { id: staffSession.subUser.id },
  });
  if (!subUser) redirect(ROUTES.auth.login);

  return (
    <main className="px-6 py-10 max-w-3xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your personal details and password.
        </p>
      </div>
      <div className="border-t border-border" />
      <SubUserProfileClient
        user={{
          id:        subUser.id,
          name:      subUser.name,
          username:  subUser.username,
          phone:     subUser.phone,
          avatarUrl: subUser.avatarUrl,
          language:  subUser.language,
        }}
      />
    </main>
  );
}

export default SubUserProfilePage;