import { redirect }            from "next/navigation";
import { getMasterProfile }    from "@/data/master";
import { prisma }              from "@/lib/prisma";
import { ROUTES }              from "@/routes";
import { LoyaltyManageClient } from "@/components/portal/loyalty/loyalty-manage-client";

export default async function ManageLoyaltyPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);
  const { masterProfile } = result;

  const [program, products, categories, sites] = await Promise.all([
    prisma.loyaltyProgram.findUnique({
      where:   { masterProfileId: masterProfile.id },
      include: {
        rewards:   {
          where:   { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { product: { select: { id: true, name: true } } },
        },
        earnRules: {
          where:   { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: {
            product:  { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.product.findMany({
      where:   { masterProfileId: masterProfile.id, deletedAt: null, isActive: true },
      select:  { id: true, name: true, sellingPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where:   { masterProfileId: masterProfile.id, deletedAt: null, siteId: null },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.site.findMany({
      where:   { masterProfileId: masterProfile.id, isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="px-6 py-10 max-w-5xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Manage</p>
        <h1 className="text-3xl font-bold tracking-tight">Loyalty Program</h1>
        <p className="text-sm text-muted-foreground">
          Create rewards customers can redeem with points, and set up bonus earning rules.
        </p>
      </div>
      <div className="border-t border-border" />
      {!program?.isEnabled ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <span className="text-2xl">⭐</span>
          </div>
          <p className="font-semibold text-lg">Loyalty program is disabled</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Enable the loyalty program in Settings → Loyalty first before managing rewards and rules.
          </p>
          <a href={ROUTES.dashboard.settings?.loyalty ?? "/dashboard/settings/loyalty"}
            className="mt-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium">
            Go to Settings
          </a>
        </div>
      ) : (
        <LoyaltyManageClient
          rewards={program.rewards.map((r) => ({
            id:             r.id,
            name:           r.name,
            description:    r.description,
            type:           r.type,
            pointsCost:     r.pointsCost,
            discountValue:  r.discountValue,
            productId:      r.productId,
            productName:    r.product?.name ?? null,
            voucherNote:    r.voucherNote,
            isActive:       r.isActive,
            isGlobal:       r.isGlobal,
            siteId:         r.siteId,
            maxRedemptions: r.maxRedemptions,
            redemptionCount: r.redemptionCount,
            expiresAt:      r.expiresAt,
          }))}
          earnRules={program.earnRules.map((r) => ({
            id:           r.id,
            name:         r.name,
            description:  r.description,
            productId:    r.productId,
            productName:  r.product?.name  ?? null,
            categoryId:   r.categoryId,
            categoryName: r.category?.name ?? null,
            bonusType:    r.bonusType as "MULTIPLIER" | "FLAT",
            bonusValue:   r.bonusValue,
            isActive:     r.isActive,
            siteId:       r.siteId,
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