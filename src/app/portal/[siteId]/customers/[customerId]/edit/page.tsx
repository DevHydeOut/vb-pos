// src/app/(structure)/portal/[siteId]/customers/[customerId]/edit/page.tsx

import { redirect }           from "next/navigation";
import { notFound }           from "next/navigation";
import { getMasterProfile }   from "@/data/master";
import { getStaffSession }    from "@/actions/auth/staff";
import { prisma }             from "@/lib/prisma";
import { ROUTES }             from "@/routes";
import { CustomerFormClient } from "@/components/portal/customers/customer-form-client";

export default async function EditCustomerPage({
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

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, masterProfileId, deletedAt: null },
  });

  if (!customer) notFound();

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Edit Customer</h1>
        <p className="text-sm text-muted-foreground mt-1">{customer.name}</p>
      </div>
      <CustomerFormClient
        customer={{
          id:          customer.id,
          name:        customer.name,
          phone:       customer.phone,
          email:       customer.email,
          dateOfBirth: customer.dateOfBirth,
          notes:       customer.notes,
          isActive:    customer.isActive,
        }}
        siteId={siteId}
        backUrl={ROUTES.staff.customer(siteId, customerId)}
      />
    </main>
  );
}