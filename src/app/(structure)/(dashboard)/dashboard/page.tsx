import Link                from "next/link";
import { getSites }        from "@/data/site";
import { SitesSection }    from "@/components/site/sites-section";
import { prisma }          from "@/lib/prisma";
import { MANAGE_RESOURCES } from "@/config/manage-resources";
import {
  Building2, Users, TrendingUp, Activity, ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const { sites, masterProfile } = await getSites();

  const [totalStaff, totalSites] = await Promise.all([
    prisma.subUser.count({ where: { masterProfileId: masterProfile.id } }),
    prisma.site.count({ where: { masterProfileId: masterProfile.id, isActive: true } }),
  ]);

  const stats = [
    {
      label: "Active Sites",
      value: totalSites,
      icon:  <Building2 className="w-5 h-5" />,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      label: "Staff Members",
      value: totalStaff,
      icon:  <Users className="w-5 h-5" />,
      color: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    },
    {
      label: "Total Sales",
      value: "—",
      icon:  <TrendingUp className="w-5 h-5" />,
      color: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    },
    {
      label: "Activity",
      value: "—",
      icon:  <Activity className="w-5 h-5" />,
      color: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    },
  ];

  return (
    <div className="p-8 space-y-10">

      {/* ── Page header ───────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage sites, staff, stock, billing and royalty points from one place.
        </p>
      </div>

      {/* ── Stats row ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label}
            className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Manage — quick access ──────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Core Modules</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              The app is focused on stock management, POS billing and royalty points.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MANAGE_RESOURCES.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.key} href={r.path}
                className={`group relative flex flex-col gap-4 p-5 bg-card border border-border
                  rounded-2xl transition-all ${
                  r.available
                    ? "hover:border-foreground/20 hover:shadow-md cursor-pointer"
                    : "opacity-60 cursor-not-allowed pointer-events-none"
                }`}>

                {/* Coming soon badge */}
                {!r.available && (
                  <span className="absolute top-4 right-4 text-xs bg-muted
                    text-muted-foreground px-2 py-0.5 rounded-lg">
                    Coming soon
                  </span>
                )}

                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-foreground flex items-center
                  justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5 text-background" />
                </div>

                {/* Text */}
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {r.description}
                  </p>
                </div>

                {/* Arrow */}
                {r.available && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground
                    group-hover:text-foreground transition-colors">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
