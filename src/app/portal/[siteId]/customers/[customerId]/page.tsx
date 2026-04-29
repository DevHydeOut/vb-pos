// src/app/(structure)/portal/[siteId]/customers/[customerId]/page.tsx

import { redirect }               from "next/navigation";
import { notFound }               from "next/navigation";
import { getMasterProfile }       from "@/data/master";
import { getStaffSession }        from "@/actions/auth/staff";
import { prisma }                 from "@/lib/prisma";
import { ROUTES }                 from "@/routes";
import { CustomerProfileClient }  from "@/components/portal/customers/customer-profile-client";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ siteId: string; customerId: string }>;
}) {
  const { siteId, customerId } = await params;

  const masterResult = await getMasterProfile().catch(() => null);
  const staffSession = await getStaffSession().catch(() => null);
  if (!masterResult && !staffSession) redirect(ROUTES.auth.login);

  const masterProfileId = masterResult
    ? masterResult.masterProfile.id
    : (await prisma.site.findUnique({ where: { id: siteId } }))!.masterProfileId;

  const [customer, loyaltyProgram] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, masterProfileId, deletedAt: null },
      include: {
        loyalty:   true,
        loyaltyTx: {
          orderBy: { createdAt: "desc" },
          take:    50,
          include: { reward: { select: { name: true } } },
        },
      },
    }),
    prisma.loyaltyProgram.findUnique({
      where:  { masterProfileId },
      select: { isEnabled: true, pointsName: true },
    }),
  ]);

  if (!customer) notFound();

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto">
      <CustomerProfileClient
        customer={{
          id:             customer.id,
          name:           customer.name,
          phone:          customer.phone,
          email:          customer.email,
          dateOfBirth:    customer.dateOfBirth,
          notes:          customer.notes,
          isActive:       customer.isActive,
          createdAt:      customer.createdAt,
          currentPoints:  customer.loyalty?.currentPoints  ?? 0,
          lifetimePoints: customer.loyalty?.lifetimePoints ?? 0,
          lifetimeSpend:  customer.loyalty?.lifetimeSpend  ?? 0,
          transactions:   customer.loyaltyTx.map((tx) => ({
            id:            tx.id,
            type:          tx.type,
            points:        tx.points,
            balanceBefore: tx.balanceBefore,
            balanceAfter:  tx.balanceAfter,
            note:          tx.note,
            rewardName:    tx.reward?.name ?? null,
            createdAt:     tx.createdAt,
          })),
        }}
        siteId={siteId}
        isMaster={!!masterResult}
        loyaltyEnabled={loyaltyProgram?.isEnabled ?? false}
        pointsName={loyaltyProgram?.pointsName ?? "Points"}
        backUrl={ROUTES.staff.customers(siteId)}
      />
    </main>
  );
}