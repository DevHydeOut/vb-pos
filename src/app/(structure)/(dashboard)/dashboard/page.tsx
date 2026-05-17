import Link from "next/link";
import { getSites } from "@/data/site";
import { prisma } from "@/lib/prisma";
import { MANAGE_RESOURCES } from "@/config/manage-resources";
import {
  Activity,
  ArrowRight,
  Building2,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";

function money(symbol: string, value: number) {
  return `${symbol}${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDailySales(orders: { createdAt: Date; grandTotal: number }[]) {
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      key: dateKey(date),
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      total: 0,
    };
  });

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const order of orders) {
    const bucket = byKey.get(dateKey(order.createdAt));
    if (bucket) bucket.total += order.grandTotal;
  }

  return buckets;
}

export default async function DashboardPage() {
  const { masterProfile } = await getSites();

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 6);
  last7Days.setHours(0, 0, 0, 0);

  const [totalStaff, totalSites, recentOrders, lowStockCount, customersWithPoints] = await Promise.all([
    prisma.subUser.count({ where: { masterProfileId: masterProfile.id } }),
    prisma.site.count({ where: { masterProfileId: masterProfile.id, isActive: true } }),
    prisma.saleOrder.findMany({
      where: { masterProfileId: masterProfile.id, createdAt: { gte: last7Days } },
      select: { createdAt: true, grandTotal: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.count({
      where: {
        masterProfileId: masterProfile.id,
        deletedAt: null,
        isActive: true,
        hasVariants: false,
        stock: { lte: 5 },
      },
    }),
    prisma.customer.count({
      where: {
        masterProfileId: masterProfile.id,
        deletedAt: null,
        loyalty: { currentPoints: { gt: 0 } },
      },
    }),
  ]);

  const weeklySales = recentOrders.reduce((sum, order) => sum + order.grandTotal, 0);
  const dailySales = buildDailySales(recentOrders);
  const maxDailySales = Math.max(...dailySales.map((day) => day.total), 1);

  const stats = [
    {
      label: "Active Sites",
      value: totalSites,
      icon: <Building2 className="h-5 w-5" />,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      label: "Staff Members",
      value: totalStaff,
      icon: <Users className="h-5 w-5" />,
      color: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    },
    {
      label: "Weekly Sales",
      value: money(masterProfile.currencySymbol, weeklySales),
      icon: <TrendingUp className="h-5 w-5" />,
      color: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    },
    {
      label: "Customers with Points",
      value: customersWithPoints,
      icon: <Activity className="h-5 w-5" />,
      color: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    },
  ];

  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Manage sites, staff, stock, billing and royalty points from one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Sales Analytics</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">All-site sales for the last 7 days.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 flex h-56 items-end gap-3 rounded-xl border border-border bg-muted/20 px-4 pb-4 pt-6">
            {dailySales.map((day) => {
              const height = Math.max(day.total > 0 ? 12 : 3, Math.round((day.total / maxDailySales) * 160));
              return (
                <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-[170px] w-full items-end justify-center">
                    <div
                      className="w-full max-w-14 rounded-t-md bg-foreground"
                      style={{ height }}
                      title={`${day.label}: ${money(masterProfile.currencySymbol, day.total)}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{day.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl font-bold">Stock & Loyalty</h2>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" /> Low stock products
              </span>
              <span className="font-bold">{lowStockCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" /> Bills this week
              </span>
              <span className="font-bold">{recentOrders.length}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Core Modules</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              The app is focused on stock management, POS billing and royalty points.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MANAGE_RESOURCES.map((resource) => {
            const Icon = resource.icon;
            return (
              <Link
                key={resource.key}
                href={resource.path}
                className={`group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all ${
                  resource.available
                    ? "cursor-pointer hover:border-foreground/20 hover:shadow-md"
                    : "pointer-events-none cursor-not-allowed opacity-60"
                }`}
              >
                {!resource.available && (
                  <span className="absolute right-4 top-4 rounded-lg bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Not active
                  </span>
                )}

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground transition-transform group-hover:scale-105">
                  <Icon className="h-5 w-5 text-background" />
                </div>

                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-foreground">{resource.label}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{resource.description}</p>
                </div>

                {resource.available && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                    <span>Open</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
