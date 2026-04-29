import { redirect }         from "next/navigation";
import { getMasterProfile } from "@/data/master";
import { ROUTES }           from "@/routes";
import { CouponFormClient } from "@/components/portal/sale/coupon-form-client";

export default async function ManageNewCouponPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);

  return <CouponFormClient siteId={null} coupon={null} />;
}