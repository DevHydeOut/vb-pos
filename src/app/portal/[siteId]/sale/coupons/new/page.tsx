// src/app/portal/[siteId]/sale/coupons/new/page.tsx
 
import { redirect }         from "next/navigation";
import { getStaffSession }  from "@/actions/auth/staff";
import { getMasterProfile } from "@/data/master";
import { ROUTES }           from "@/routes";
import { CouponFormClient } from "@/components/portal/sale/coupon-form-client";
 
export async function NewCouponPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId }   = await params;
  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);
  if (!staffSession && !masterResult) redirect(ROUTES.auth.login);
 
  return <CouponFormClient siteId={siteId} coupon={null} />;
}
 
export default NewCouponPage;