import { notFound, redirect } from "next/navigation";
import { prisma }   from "@/lib/prisma";
import { CouponFormClient } from "@/components/portal/sale/coupon-form-client";
import { getMasterProfile } from "@/data/master";
import { ROUTES } from "@/routes";

export default async function ManageEditCouponPage({
  params,
}: {
  params: Promise<{ couponId: string }>;
}) {
  const { couponId } = await params;
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);

  const coupon = await prisma.coupon.findFirst({
    where: {
      id:              couponId,
      masterProfileId: result.masterProfile.id,
      siteId:          null,
      deletedAt:       null,
    },
  });
  if (!coupon) notFound();

  return (
    <CouponFormClient
      siteId={null}
      coupon={{
        ...coupon,
        capAmount:     coupon.capAmount     ?? null,
        minOrderValue: coupon.minOrderValue ?? null,
        expiresAt:     coupon.expiresAt     ?? null,
      }}
    />
  );
}