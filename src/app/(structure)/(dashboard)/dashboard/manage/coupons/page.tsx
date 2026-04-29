import { CouponListClient } from "@/components/portal/sale/coupon-list-client";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { redirect } from "next/navigation";

export async function ManageCouponsPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);
  const { masterProfile } = result;

  const [coupons, allSites] = await Promise.all([
    prisma.coupon.findMany({
      where:   { masterProfileId: masterProfile.id, siteId: null, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.site.findMany({
      where:   { masterProfileId: masterProfile.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="px-6 py-10 max-w-5xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Manage</p>
        <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
        <p className="text-sm text-muted-foreground">
          Global coupons. Create once and push to any site.
        </p>
      </div>
      <div className="border-t border-border" />
      <CouponListClient
        coupons={coupons.map((c) => ({ ...c, expiresAt: c.expiresAt ?? null }))}
        allSites={allSites.map((s) => ({ id: s.id, name: s.name }))}
        siteId={null}
        isMaster={true}
      />
    </main>
  );
}

export default ManageCouponsPage;