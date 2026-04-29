// src/app/portal/[siteId]/customers/loyalty/page.tsx

import { redirect }              from "next/navigation";
import { getMasterProfile }      from "@/data/master";
import { getStaffSession }       from "@/actions/auth/staff";
import { prisma }                from "@/lib/prisma";
import { ROUTES }                from "@/routes";
import { CustomerLoyaltyClient } from "@/components/portal/customers/customer-loyalty-client";

export default async function CustomerLoyaltyPage({
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

  const [customers, loyaltyProgram] = await Promise.all([
    prisma.customer.findMany({
      where:   { masterProfileId, deletedAt: null, isActive: true },
      include: { loyalty: true },
      orderBy: { loyalty: { currentPoints: "desc" } },
      take:    100,
    }),
    prisma.loyaltyProgram.findUnique({
      where:  { masterProfileId },
      select: { isEnabled: true, pointsName: true },
    }),
  ]);

  return (
    <main className="px-4 py-8 max-w-3xl mx-auto">
      <CustomerLoyaltyClient
        customers={customers.map((c) => ({
          id:             c.id,
          name:           c.name,
          phone:          c.phone,
          currentPoints:  c.loyalty?.currentPoints  ?? 0,
          lifetimePoints: c.loyalty?.lifetimePoints ?? 0,
          lifetimeSpend:  c.loyalty?.lifetimeSpend  ?? 0,
        }))}
        siteId={siteId}
        loyaltyEnabled={loyaltyProgram?.isEnabled ?? false}
        pointsName={loyaltyProgram?.pointsName ?? "Points"}
      />
    </main>
  );
}