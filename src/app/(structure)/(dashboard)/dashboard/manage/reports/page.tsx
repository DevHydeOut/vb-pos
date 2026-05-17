import { redirect } from "next/navigation";
import { Download, Receipt, TrendingUp } from "lucide-react";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";

function money(symbol: string, value: number) {
  return `${symbol}${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthBounds(month: string) {
  const [year, rawMonth] = month.split("-").map(Number);
  const start = new Date(year, rawMonth - 1, 1);
  const end = new Date(year, rawMonth, 1);
  return { start, end };
}

export default async function MonthlyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; siteId?: string; paymentMethod?: string }>;
}) {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);
  const { masterProfile } = result;

  const params = await searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : currentMonth;
  const siteId = params.siteId ?? "all";
  const paymentMethod = ["all", "CASH", "CARD", "ONLINE"].includes(params.paymentMethod ?? "")
    ? params.paymentMethod ?? "all"
    : "all";
  const { start, end } = monthBounds(month);

  const [sites, orders] = await Promise.all([
    prisma.site.findMany({
      where: { masterProfileId: masterProfile.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.saleOrder.findMany({
      where: {
        masterProfileId: masterProfile.id,
        createdAt: { gte: start, lt: end },
        ...(siteId !== "all" ? { siteId } : {}),
        ...(paymentMethod !== "all" ? { paymentMethod } : {}),
      },
      include: {
        site: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalSales = orders.reduce((sum, order) => sum + order.grandTotal, 0);
  const totalTax = orders.reduce((sum, order) => sum + order.taxTotal, 0);
  const totalDiscount = orders.reduce((sum, order) => sum + order.itemDiscountTotal + order.rewardDiscountTotal, 0);
  const downloadParams = new URLSearchParams({ month, siteId, paymentMethod });

  return (
    <main className="max-w-6xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Billing System</p>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Sales Report</h1>
          <p className="text-sm text-muted-foreground">Review monthly sales and download a CSV report.</p>
        </div>
        <a
          href={`/api/reports/monthly-sales?${downloadParams.toString()}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background"
        >
          <Download className="h-4 w-4" /> Download CSV
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="grid gap-1.5 text-sm">
          Month
          <input type="month" name="month" defaultValue={month} className="h-10 rounded-xl border border-border bg-background px-3" />
        </label>
        <label className="grid gap-1.5 text-sm">
          Site
          <select name="siteId" defaultValue={siteId} className="h-10 rounded-xl border border-border bg-background px-3">
            <option value="all">All sites</option>
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          Payment
          <select name="paymentMethod" defaultValue={paymentMethod} className="h-10 rounded-xl border border-border bg-background px-3">
            <option value="all">All methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="ONLINE">Online</option>
          </select>
        </label>
        <button className="h-10 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
          Apply
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Bills", value: orders.length.toLocaleString(), icon: Receipt },
          { label: "Sales", value: money(masterProfile.currencySymbol, totalSales), icon: TrendingUp },
          { label: "Tax", value: money(masterProfile.currencySymbol, totalTax), icon: Receipt },
          { label: "Discounts", value: money(masterProfile.currencySymbol, totalDiscount), icon: Receipt },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-3 text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Bills</h2>
        </div>
        <div className="divide-y divide-border">
          {orders.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No bills found for this month.</p>
          ) : orders.map((order) => (
            <div key={order.id} className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_auto_auto_auto]">
              <div>
                <p className="font-medium">{order.referenceNo}</p>
                <p className="text-xs text-muted-foreground">{order.createdAt.toLocaleString()}</p>
              </div>
              <div>
                <p>{order.customer.name || "Walk-in customer"}</p>
                <p className="text-xs text-muted-foreground">{order.customer.phone} - {order.site.name}</p>
              </div>
              <p className="text-muted-foreground">{order.paymentMethod}</p>
              <p className="text-muted-foreground">{order.items.length} items</p>
              <p className="font-semibold">{money(masterProfile.currencySymbol, order.grandTotal)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
