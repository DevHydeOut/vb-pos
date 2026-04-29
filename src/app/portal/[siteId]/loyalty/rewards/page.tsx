import Link from "next/link";
import { redirect } from "next/navigation";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { LoyaltyManageClient } from "@/components/portal/loyalty/loyalty-manage-client";

export default async function LoyaltyRewardsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const result = await getMasterProfile().catch(() => null);
  if (!result) redirect(ROUTES.auth.login);

  const { masterProfile } = result;

  const [site, program, products, categories, sites] = await Promise.all([
    prisma.site.findFirst({ where: { id: siteId, masterProfileId: masterProfile.id, isActive: true } }),
    prisma.loyaltyProgram.findUnique({
      where: { masterProfileId: masterProfile.id },
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
      where: { masterProfileId: masterProfile.id, deletedAt: null, isActive: true },
      select: { id: true, name: true, sellingPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { masterProfileId: masterProfile.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.site.findMany({
      where: { masterProfileId: masterProfile.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!site) redirect(ROUTES.dashboard.sites);

  return (
    <main className="px-6 py-10 max-w-5xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{site.name}</p>
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
          <Link
            href={ROUTES.dashboard.globalSettings.loyalty}
            className="mt-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium"
          >
            Open Settings
          </Link>
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
          currencySymbol={masterProfile.currencySymbol ?? "$"}
        />
      )}
    </main>
  );
}
