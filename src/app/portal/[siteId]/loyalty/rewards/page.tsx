import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMasterProfile } from "@/data/master";
import { getStaffSession } from "@/actions/auth/staff";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { LoyaltyManageClient } from "@/components/portal/loyalty/loyalty-manage-client";

async function resolveAccess(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult.masterProfile.id, isActive: true },
      select: { id: true, name: true },
    });
    if (!site) notFound();
    return {
      masterProfileId: masterResult.masterProfile.id,
      currencySymbol: masterResult.masterProfile.currencySymbol,
      siteName: site.name,
      isMaster: true,
    };
  }

  const staffSession = await getStaffSession().catch(() => null);
  if (!staffSession) redirect(ROUTES.auth.login);

  const subUserSite = await prisma.subUserSite.findUnique({
    where: { subUserId_siteId: { subUserId: staffSession.subUserId, siteId } },
    include: { site: true, permissions: { include: { module: true, page: true } } },
  });
  if (!subUserSite?.site.isActive) notFound();

  const canManageRewards = subUserSite.permissions.some(
    (permission) =>
      (permission.module?.key === "loyalty" && !permission.page) ||
      permission.page?.key === "loyalty.rewards"
  );
  if (!canManageRewards) notFound();

  return {
    masterProfileId: subUserSite.site.masterProfileId,
    currencySymbol: subUserSite.site.currencySymbol,
    siteName: subUserSite.site.name,
    isMaster: false,
  };
}

export default async function LoyaltyRewardsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const access = await resolveAccess(siteId);

  const [program, products, categories, sites] = await Promise.all([
    prisma.loyaltyProgram.findUnique({
      where: { masterProfileId: access.masterProfileId },
      include: {
        rewards: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { product: { select: { id: true, name: true } } },
        },
        earnRules: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: {
            product: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { masterProfileId: access.masterProfileId, deletedAt: null, isActive: true },
      select: { id: true, name: true, sellingPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { masterProfileId: access.masterProfileId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.site.findMany({
      where: { masterProfileId: access.masterProfileId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="px-6 py-10 max-w-5xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{access.siteName}</p>
        <h1 className="text-3xl font-bold tracking-tight">Royalty Points</h1>
        <p className="text-sm text-muted-foreground">
          Rewards and earning rules are global, so customers can claim points from any site.
        </p>
      </div>
      <div className="border-t border-border" />
      {!program?.isEnabled ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <span className="text-2xl font-bold">R</span>
          </div>
          <p className="font-semibold text-lg">Royalty points are disabled</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Enable the points program before creating rewards and earning rules.
          </p>
          {access.isMaster && (
            <Link
              href={ROUTES.dashboard.globalSettings.loyalty}
              className="mt-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium"
            >
              Open Settings
            </Link>
          )}
        </div>
      ) : (
        <LoyaltyManageClient
          rewards={program.rewards.map((reward) => ({
            id: reward.id,
            name: reward.name,
            description: reward.description,
            type: reward.type,
            pointsCost: reward.pointsCost,
            discountValue: reward.discountValue,
            productId: reward.productId,
            productName: reward.product?.name ?? null,
            voucherNote: reward.voucherNote,
            isActive: reward.isActive,
            isGlobal: reward.isGlobal,
            siteId: reward.siteId,
            maxRedemptions: reward.maxRedemptions,
            redemptionCount: reward.redemptionCount,
            expiresAt: reward.expiresAt,
          }))}
          earnRules={program.earnRules.map((rule) => ({
            id: rule.id,
            name: rule.name,
            description: rule.description,
            productId: rule.productId,
            productName: rule.product?.name ?? null,
            categoryId: rule.categoryId,
            categoryName: rule.category?.name ?? null,
            bonusType: rule.bonusType as "MULTIPLIER" | "FLAT",
            bonusValue: rule.bonusValue,
            isActive: rule.isActive,
            siteId: rule.siteId,
          }))}
          products={products}
          categories={categories}
          sites={sites}
          pointsName={program.pointsName}
          currencySymbol={access.currencySymbol ?? "$"}
        />
      )}
    </main>
  );
}
