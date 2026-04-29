"use client";

// src/components/portal/customers/customer-loyalty-client.tsx

import { useState }  from "react";
import { useRouter } from "next/navigation";
import {
  Star, TrendingUp, Users, Trophy,
  Search, X, ChevronRight,
} from "lucide-react";
import { ROUTES } from "@/routes";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

/* ── Types ───────────────────────────────────────────────────── */

interface Customer {
  id:             string;
  name:           string;
  phone:          string;
  currentPoints:  number;
  lifetimePoints: number;
  lifetimeSpend:  number;
}

interface Props {
  customers:      Customer[];
  siteId:         string;
  loyaltyEnabled: boolean;
  pointsName:     string;
}

/* ── Medal helpers ───────────────────────────────────────────── */

const MEDAL = ["🥇", "🥈", "🥉"];

/* ── Component ───────────────────────────────────────────────── */

export function CustomerLoyaltyClient({
  customers, siteId, loyaltyEnabled, pointsName,
}: Props) {
  const router  = useRouter();
  const [search, setSearch] = useState("");
  const [tab,    setTab]    = useState<"points" | "lifetime" | "spend">("points");

  if (!loyaltyEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-2xl">
          ⭐
        </div>
        <p className="font-semibold text-lg">Loyalty program is disabled</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Enable the loyalty program in settings to start tracking customer points.
        </p>
        <button
          onClick={() => router.push(ROUTES.staff.loyalty(siteId))}
          className="px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium">
          Go to Settings
        </button>
      </div>
    );
  }

  // Sort by selected tab
  const sorted = [...customers].sort((a, b) => {
    if (tab === "points")   return b.currentPoints  - a.currentPoints;
    if (tab === "lifetime") return b.lifetimePoints - a.lifetimePoints;
    return b.lifetimeSpend - a.lifetimeSpend;
  });

  const filtered = sorted.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  // Summary stats
  const totalPoints    = customers.reduce((s, c) => s + c.currentPoints, 0);
  const activeMembers  = customers.filter((c) => c.currentPoints > 0).length;
  const totalSpend     = customers.reduce((s, c) => s + c.lifetimeSpend, 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <PageHeader title="pointsName + ' Overview'" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Star className="h-4 w-4 text-warning" />
            <p className="text-xs text-muted-foreground">Points in Circulation</p>
          </div>
          <p className="text-xl font-bold tabular-nums">{totalPoints.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">outstanding</p>
        </div>
        <div className="border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="h-4 w-4 text-info" />
            <p className="text-xs text-muted-foreground">Active Members</p>
          </div>
          <p className="text-xl font-bold tabular-nums">{activeMembers.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">have points</p>
        </div>
        <div className="border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="h-4 w-4 text-success" />
            <p className="text-xs text-muted-foreground">Total Spend</p>
          </div>
          <p className="text-xl font-bold tabular-nums">
            {totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">lifetime</p>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex border-b border-border">
        {([
          { key: "points"   as const, label: `Current ${pointsName}` },
          { key: "lifetime" as const, label: "Lifetime Earned"       },
          { key: "spend"    as const, label: "Lifetime Spend"        },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full h-10 pl-10 pr-9 rounded-xl border border-border bg-background
            text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Leaderboard */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No customers found
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((customer, idx) => {
            const value = tab === "points"
              ? customer.currentPoints
              : tab === "lifetime"
              ? customer.lifetimePoints
              : customer.lifetimeSpend;

            const rank = search ? null : idx;

            return (
              <button
                key={customer.id}
                onClick={() => router.push(ROUTES.staff.customer(siteId, customer.id))}
                className="w-full flex items-center gap-4 px-4 py-3.5 border border-border
                  rounded-2xl hover:bg-muted/40 transition-colors text-left group">

                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {rank !== null && rank < 3
                    ? <span className="text-xl">{MEDAL[rank]}</span>
                    : <span className="text-sm font-bold text-muted-foreground tabular-nums">
                        {rank !== null ? rank + 1 : "—"}
                      </span>}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center
                  shrink-0 text-sm font-semibold text-muted-foreground">
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                </div>

                {/* Value */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    {tab === "points" || tab === "lifetime"
                      ? <Star className="h-3.5 w-3.5 text-warning" />
                      : <TrendingUp className="h-3.5 w-3.5 text-success" />}
                    <span className="text-sm font-bold tabular-nums">
                      {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tab === "points" ? "available" : tab === "lifetime" ? "total earned" : "spent"}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground
                  group-hover:text-foreground transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}