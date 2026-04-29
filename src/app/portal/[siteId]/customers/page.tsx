import { redirect }          from "next/navigation";
import { getMasterProfile }  from "@/data/master";
import { getStaffSession }   from "@/actions/auth/staff";
import { prisma }            from "@/lib/prisma";
import { ROUTES }            from "@/routes";
import { CustomerListClient } from "@/components/portal/customers/customer-list-client";
 
export default async function PortalCustomersPage({
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
 
  const [customers, master] = await Promise.all([
    prisma.customer.findMany({
      where:   { masterProfileId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { loyalty: true },
    }),
    prisma.masterProfile.findUnique({ where: { id: masterProfileId } }),
  ]);
 
  // Get loyalty program to know points name
  const loyaltyProgram = await prisma.loyaltyProgram.findUnique({
    where: { masterProfileId },
    select: { isEnabled: true, pointsName: true },
  });
 
  return (
    <main className="px-4 py-8 max-w-4xl mx-auto">
      <CustomerListClient
        customers={customers.map((c) => ({
          id:            c.id,
          name:          c.name,
          phone:         c.phone,
          email:         c.email,
          isActive:      c.isActive,
          createdAt:     c.createdAt,
          currentPoints: c.loyalty?.currentPoints  ?? 0,
          lifetimePoints: c.loyalty?.lifetimePoints ?? 0,
        }))}
        siteId={siteId}
        loyaltyEnabled={loyaltyProgram?.isEnabled ?? false}
        pointsName={loyaltyProgram?.pointsName ?? "Points"}
      />
    </main>
  );
}