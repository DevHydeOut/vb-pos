"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ArrowUp, ArrowDown, RefreshCcw, Package, Truck, Wrench, ShoppingCart, Search, X, Filter, SlidersHorizontal, ChevronLeft,} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────── */

interface Movement {
  id:             string;
  type:           string;
  quantity:       number;
  quantityBefore: number;
  quantityAfter:  number;
  note:           string | null;
  productId:      string;
  productName:    string;
  variantId:      string | null;
  variantName:    string | null;
  createdAt:      Date;
}

interface Props {
  movements: Movement[];
  siteId:    string;
}

/* ── Movement type config ────────────────────────────────────── */

const TYPE_CONFIG: Record<string, {
  label:     string;
  icon:      React.ComponentType<{ className?: string }>;
  color:     string;
  bg:        string;
  direction: "in" | "out" | "both";
}> = {
  SALE:         { label: "Sale",          icon: ShoppingCart, color: "text-info",    bg: "bg-info-muted",    direction: "out"  },
  RETURN:       { label: "Return",        icon: RefreshCcw,   color: "text-success", bg: "bg-success-muted", direction: "in"   },
  ADJUSTMENT:   { label: "Adjustment",   icon: Wrench,       color: "text-purple-600",  bg: "bg-purple-500/10",  direction: "both" },
  TRANSFER_IN:  { label: "Transfer In",  icon: ArrowDown,    color: "text-success", bg: "bg-success-muted", direction: "in"   },
  TRANSFER_OUT: { label: "Transfer Out", icon: ArrowUp,      color: "text-warning",  bg: "bg-warning-muted",  direction: "out"  },
  PURCHASE:     { label: "Purchase",     icon: Truck,        color: "text-success", bg: "bg-success-muted", direction: "in"   },
  DAMAGE:       { label: "Damage/Loss",  icon: Package,      color: "text-danger",     bg: "bg-danger-muted",     direction: "out"  },
  OPENING:      { label: "Opening Stock", icon: Package,     color: "text-muted-foreground",   bg: "bg-muted/10",   direction: "both" },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG);

/* ── Component ───────────────────────────────────────────────── */

export function StockHistoryClient({ movements, siteId }: Props) {
  const router = useRouter();
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showFilter, setShowFilter] = useState(false);

  const filtered = movements.filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.productName.toLowerCase().includes(q) ||
        m.variantName?.toLowerCase().includes(q) ||
        m.note?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, Movement[]>>((acc, m) => {
    const date = new Date(m.createdAt).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/portal/${siteId}/inventory/stock`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground
              hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Stock
          </button>
          <span className="text-muted-foreground">/</span>
          <PageHeader title="Stock History" description="All stock movements" />
        </div>
        <button
          onClick={() => router.push(`/portal/${siteId}/inventory/adjust`)}
          className="flex items-center gap-2 px-3 py-2.5 bg-foreground text-background
            rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <SlidersHorizontal className="h-4 w-4" /> Adjust
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, note..."
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
        <button
          onClick={() => setShowFilter((p) => !p)}
          className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm
            transition-colors ${showFilter || typeFilter !== "all"
              ? "border-foreground bg-foreground text-background"
              : "border-border hover:bg-muted"}`}>
          <Filter className="h-4 w-4" />
          {typeFilter !== "all" && (
            <span className="capitalize">{TYPE_CONFIG[typeFilter]?.label}</span>
          )}
        </button>
      </div>

      {/* Type filter pills */}
      {showFilter && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-xl">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === "all"
                ? "bg-foreground text-background"
                : "bg-background border border-border hover:bg-muted"
            }`}>
            All Types
          </button>
          {ALL_TYPES.map((t) => {
            const cfg  = TYPE_CONFIG[t];
            const Icon = cfg.icon;
            return (
              <button key={t} onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                  font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-foreground text-background"
                    : "bg-background border border-border hover:bg-muted"
                }`}>
                <Icon className="h-3 w-3" /> {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No movements found</p>
          <p className="text-sm text-muted-foreground">
            {search || typeFilter !== "all"
              ? "Try adjusting your search or filter"
              : "Stock movements will appear here as you make adjustments and sales"}
          </p>
        </div>
      ) : (
        /* Grouped by date */
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase
                tracking-widest px-1">
                {date}
              </p>
              <div className="space-y-2">
                {items.map((m) => {
                  const cfg  = TYPE_CONFIG[m.type] ?? TYPE_CONFIG.ADJUSTMENT;
                  const Icon = cfg.icon;
                  const isIn = m.quantity > 0;

                  return (
                    <div key={m.id}
                      className="flex items-center gap-3 px-4 py-3.5 border border-border
                        rounded-2xl hover:bg-muted/30 transition-colors">

                      {/* Type icon */}
                      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center
                        justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">{m.productName}</p>
                          {m.variantName && (
                            <span className="text-xs text-muted-foreground">
                              · {m.variantName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-lg font-medium
                            ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {m.note && (
                            <span className="text-xs text-muted-foreground truncate">
                              {m.note}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stock change */}
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${
                          isIn ? "text-success" : "text-danger"
                        }`}>
                          {isIn ? "+" : ""}{m.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {m.quantityBefore} → {m.quantityAfter}
                        </p>
                      </div>

                      {/* Time */}
                      <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        {new Date(m.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="text-center text-xs text-muted-foreground pt-2">
            Showing {filtered.length} movements
            {filtered.length < movements.length ? ` (filtered from ${movements.length})` : ""}
          </p>
        </div>
      )}
    </div>
  );
}