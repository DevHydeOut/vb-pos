// src/app/(structure)/portal/[siteId]/customers/new/page.tsx

import { redirect }           from "next/navigation";
import { getMasterProfile }   from "@/data/master";
import { getStaffSession }    from "@/actions/auth/staff";
import { prisma }             from "@/lib/prisma";
import { ROUTES }             from "@/routes";
import { CustomerFormClient } from "@/components/portal/customers/customer-form-client";

export default async function NewCustomerPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId }   = await params;
  const masterResult = await getMasterProfile().catch(() => null);
  const staffSession = await getStaffSession().catch(() => null);
  if (!masterResult && !staffSession) redirect(ROUTES.auth.login);

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold">New Customer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new customer to your database
        </p>
      </div>
      <CustomerFormClient
        siteId={siteId}
        backUrl={ROUTES.staff.customers(siteId)}
      />
    </main>
  );
}