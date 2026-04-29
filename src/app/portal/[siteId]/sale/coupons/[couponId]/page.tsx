// src/app/portal/[siteId]/sale/coupons/[couponId]/page.tsx
 
import { notFound, redirect } from "next/navigation";
import { prisma }   from "@/lib/prisma";
import { getStaffSession } from "@/actions/auth/staff";
import { CouponFormClient } from "@/components/portal/sale/coupon-form-client";
import { getMasterProfile } from "@/data/master";
import { ROUTES } from "@/routes";
 
export async function EditCouponPage({
  params,
}: {
  params: Promise<{ siteId: string; couponId: string }>;
}) {
  const { siteId, couponId } = await params;
  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);
  if (!staffSession && !masterResult) redirect(ROUTES.auth.login);
 
  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, siteId, deletedAt: null },
  });
  if (!coupon) notFound();
 
  return (
    <CouponFormClient
      siteId={siteId}
      coupon={{
        ...coupon,
        expiresAt: coupon.expiresAt ?? null,
      }}
    />
  );
}
 