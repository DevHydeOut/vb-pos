import { notFound, redirect } from "next/navigation";
import { BarChart3, Receipt, ShoppingBag, Star, TrendingUp } from "lucide-react";
import { getMasterProfile } from "@/data/master";
import { getStaffSession } from "@/actions/auth/staff";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";

async function resolveAccess(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult.masterProfile.id, isActive: true },
      select: { id: true, name: true, currencySymbol: true },
    });
    if (!site) notFound();
    return {
      masterProfileId: masterResult.masterProfile.id,
      siteName: site.name,
      currencySymbol: site.currencySymbol,
    };
  }

  const staffSession = await getStaffSession().catch(() => null);
  if (!staffSession) redirect(ROUTES.auth.login);

  const subUserSite = await prisma.subUserSite.findUnique({
    where: { subUserId_siteId: { subUserId: staffSession.subUserId, siteId } },
    include: { site: true, permissions: { include: { module: true, page: true } } },
  });
  if (!subUserSite?.site.isActive) notFound();

  const canViewAnalytics = subUserSite.permissions.some(
    (permission) =>
      (permission.module?.key === "billing" && !permission.page) ||
      permission.page?.key === "billing.analytics"
  );
  if (!canViewAnalytics) notFound();

  return {
    masterProfileId: subUserSite.site.masterProfileId,
    siteName: subUserSite.site.name,
    currencySymbol: subUserSite.site.currencySymbol,
  };
}

function money(symbol: string, value: number) {
  return `${symbol}${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDailySales(orders: { createdAt: Date; grandTotal: number }[], days: number) {
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    return {
      key: dateKey(date),
      label: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      total: 0,
      bills: 0,
    };
  });
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const order of orders) {
    const key = dateKey(order.createdAt);
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.total += order.grandTotal;
      bucket.bills += 1;
    }
  }

  return buckets;
}

function SalesBarChart({
  data,
  currencySymbol,
}: {
  data: { key: string; label: string; total: number; bills: number }[];
  currencySymbol: string;
}) {
  const max = Math.max(...data.map((day) => day.total), 1);

  return (
    <div className="mt-5 h-64 rounded-xl border border-border bg-muted/20 px-4 pb-4 pt-6">
      <div className="flex h-full items-end gap-2">
        {data.map((day) => {
          const height = Math.max(day.total > 0 ? 12 : 3, Math.round((day.total / max) * 180));
          return (
            <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-[190px] w-full items-end justify-center">
                <div
                  className="w-full max-w-12 rounded-t-md bg-foreground transition-all"
                  style={{ height }}
                  title={`${day.label}: ${currencySymbol}${day.total.toFixed(2)} from ${day.bills} bills`}
                />
              </div>
              <div className="w-full text-center">
                <p className="truncate text-[11px] text-muted-foreground">{day.label}</p>
                <p className="truncate text-[11px] font-semibold tabular-nums">
                  {day.total > 0 ? money(currencySymbol, day.total) : "-"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function BillingAnalyticsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const access = await resolveAccess(siteId);

  const today = startOfToday();
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const [orders, lowStockCount, customerPointCount] = await Promise.all([
    prisma.saleOrder.findMany({
      where: { siteId, masterProfileId: access.masterProfileId, createdAt: { gte: last30Days } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.product.count({
      where: {
        masterProfileId: access.masterProfileId,
        deletedAt: null,
        isActive: true,
        OR: [{ siteId }, { siteId: null, isGlobal: true }],
        hasVariants: false,
        stock: { lte: 5 },
      },
    }),
    prisma.customer.count({
      where: {
        masterProfileId: access.masterProfileId,
        deletedAt: null,
        loyalty: { currentPoints: { gt: 0 } },
      },
    }),
  ]);

  const todaysOrders = orders.filter((order) => order.createdAt >= today);
  const todaySales = todaysOrders.reduce((sum, order) => sum + order.grandTotal, 0);
  const periodSales = orders.reduce((sum, order) => sum + order.grandTotal, 0);
  const discountTotal = orders.reduce(
    (sum, order) => sum + order.itemDiscountTotal + order.rewardDiscountTotal,
    0
  );
  const pointsEarned = orders.reduce((sum, order) => sum + order.pointsEarned, 0);
  const averageBill = orders.length > 0 ? periodSales / orders.length : 0;

  const productStats = new Map<string, { name: string; qty: number; total: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const current = productStats.get(item.productId) ?? { name: item.productName, qty: 0, total: 0 };
      current.qty += item.quantity;
      current.total += item.lineTotal;
      productStats.set(item.productId, current);
    }
  }
  const topProducts = [...productStats.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const dailySales = buildDailySales(orders, 14);

  const cards = [
    { label: "Today Sales", value: money(access.currencySymbol, todaySales), icon: TrendingUp },
    { label: "Bills Today", value: todaysOrders.length.toLocaleString(), icon: Receipt },
    { label: "30 Day Sales", value: money(access.currencySymbol, periodSales), icon: BarChart3 },
    { label: "Average Bill", value: money(access.currencySymbol, averageBill), icon: ShoppingBag },
    { label: "Discounts Given", value: money(access.currencySymbol, discountTotal), icon: Receipt },
    { label: "Points Issued", value: pointsEarned.toLocaleString(), icon: Star },
  ];

  return (
    <main className="px-6 py-10 max-w-6xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Billing System</p>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Basic sales, billing, stock, and royalty signals for {access.siteName}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Sales Trend</h2>
              <p className="text-xs text-muted-foreground">Daily bill value for the last 14 days</p>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <SalesBarChart data={dailySales} currencySymbol={access.currencySymbol} />
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Operational Snapshot</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-sm text-muted-foreground">Low stock items</span>
              <span className="font-bold">{lowStockCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-sm text-muted-foreground">Customers with points</span>
              <span className="font-bold">{customerPointCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-sm text-muted-foreground">Bills in last 30 days</span>
              <span className="font-bold">{orders.length}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Top Products</h2>
            <span className="text-xs text-muted-foreground">Last 30 days</span>
          </div>
          <div className="mt-4 divide-y divide-border">
            {topProducts.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">No completed bills yet.</p>
            ) : topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.qty} sold</p>
                </div>
                <p className="text-sm font-semibold">{money(access.currencySymbol, product.total)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Bill Mix</h2>
          <div className="mt-4 space-y-4">
            {[
              { label: "Item discounts", value: discountTotal, max: Math.max(periodSales, 1) },
              { label: "Tax collected", value: orders.reduce((sum, order) => sum + order.taxTotal, 0), max: Math.max(periodSales, 1) },
              { label: "Net billed", value: periodSales, max: Math.max(periodSales, 1) },
            ].map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{money(access.currencySymbol, row.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${Math.min(100, Math.round((row.value / row.max) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
