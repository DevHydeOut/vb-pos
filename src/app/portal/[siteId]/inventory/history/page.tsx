import { redirect }            from "next/navigation";
import { getMasterProfile }    from "@/data/master";
import { getStaffSession }     from "@/actions/auth/staff";
import { prisma }              from "@/lib/prisma";
import { ROUTES }              from "@/routes";
import { StockHistoryClient }  from "@/components/portal/inventory/stock-history-client";
import { PageHeader } from "@/components/shared/page-header";
 
export async function StockHistoryPage({
  params,
}: { params: Promise<{ siteId: string }> }) {
  const { siteId }   = await params;
  const masterResult = await getMasterProfile().catch(() => null);
  const staffSession = await getStaffSession().catch(() => null);
  if (!masterResult && !staffSession) redirect(ROUTES.auth.login);
 
  const masterProfileId = masterResult
    ? masterResult.masterProfile.id
    : (await prisma.site.findUnique({ where: { id: siteId } }))!.masterProfileId;
 
  const movements = await prisma.stockMovement.findMany({
    where:   { masterProfileId, siteId },
    orderBy: { createdAt: "desc" },
    take:    100,
    include: {
      product: { select: { id: true, name: true } },
      variant: { select: { id: true, name: true } },
    },
  });
 
  return (
    <main className="px-4 py-8 max-w-4xl mx-auto">
      <StockHistoryClient
        movements={movements.map((m) => ({
          id:            m.id,
          type:          m.type,
          quantity:      m.quantity,
          quantityBefore: m.quantityBefore,
          quantityAfter:  m.quantityAfter,
          note:          m.note,
          productId:     m.productId,
          productName:   m.product.name,
          variantId:     m.variantId,
          variantName:   m.variant?.name ?? null,
          createdAt:     m.createdAt,
        }))}
        siteId={siteId}
      />
    </main>
  );
}
 
export default StockHistoryPage;