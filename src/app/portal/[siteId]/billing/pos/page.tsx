import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession } from "@/actions/auth/staff";
import { ROUTES } from "@/routes";
import { PosBillingClient } from "@/components/portal/billing/pos-billing-client";

async function resolveIdentity(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) return { masterProfileId: masterResult.masterProfile.id };

  const staffSession = await getStaffSession().catch(() => null);
  if (!staffSession) redirect(ROUTES.auth.login);

  const subUserSite = await prisma.subUserSite.findUnique({
    where: { subUserId_siteId: { subUserId: staffSession.subUserId, siteId } },
    include: { site: true, permissions: { include: { module: true, page: true } } },
  });
  if (!subUserSite?.site.isActive) notFound();

  const canBill = subUserSite.permissions.some(
    (permission) =>
      (permission.module?.key === "billing" && !permission.page) ||
      permission.page?.key === "billing.pos"
  );
  if (!canBill) notFound();

  return { masterProfileId: staffSession.masterProfileId };
}

export default async function BillingPosPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const identity = await resolveIdentity(siteId);

  const [site, products, program] = await Promise.all([
    prisma.site.findFirst({
      where: { id: siteId, masterProfileId: identity.masterProfileId, isActive: true },
    }),
    prisma.product.findMany({
      where: {
        masterProfileId: identity.masterProfileId,
        deletedAt: null,
        isActive: true,
        OR: [{ siteId }, { siteId: null }, { isGlobal: true }],
      },
      include: {
        variants: { where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" } },
        category: { select: { id: true, name: true } },
        taxGroup: { select: { rate: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.loyaltyProgram.findUnique({
      where: { masterProfileId: identity.masterProfileId },
      select: { isEnabled: true, pointsName: true },
    }),
  ]);

  if (!site) notFound();

  return (
    <PosBillingClient
      siteId={siteId}
      currencySymbol={site.currencySymbol}
      loyaltyEnabled={program?.isEnabled ?? false}
      pointsName={program?.pointsName ?? "Points"}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        hasVariants: product.hasVariants,
        categoryName: product.category?.name ?? null,
        taxRate: product.taxGroup?.rate ?? 0,
        imageUrl: product.images[0]?.url ?? null,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          barcode: variant.barcode,
          sellingPrice: variant.sellingPrice,
          stock: variant.stock,
        })),
      }))}
    />
  );
}
