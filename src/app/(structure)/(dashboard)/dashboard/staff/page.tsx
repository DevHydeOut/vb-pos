import { getMasterProfile }  from "@/data/master";
import { prisma }             from "@/lib/prisma";
import { PageHeader }         from "@/components/dashboard/page-header";
import { GlobalStaffClient }  from "@/components/staff/global-staff-client";

export default async function GlobalStaffPage() {
  const { masterProfile } = await getMasterProfile();

  const subUsers = await prisma.subUser.findMany({
    where:   { masterProfileId: masterProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      sites: {
        include: {
          site: true,
          permissions: {
            include: { module: true, page: true },
          },
        },
      },
    },
  });

  const allSites = await prisma.site.findMany({
    where:   { masterProfileId: masterProfile.id },
    orderBy: { name: "asc" },
  });


  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Staff"
        description={
          subUsers.length === 0
            ? "No staff members yet — add your first one to get started."
            : `${subUsers.length} member${subUsers.length !== 1 ? "s" : ""} across ${allSites.length} site${allSites.length !== 1 ? "s" : ""}`
        }
      />

      <GlobalStaffClient
        subUsers={subUsers}
        allSites={allSites}
        accountId={masterProfile.accountId}
      />
    </div>
  );
}