"use client";

// src/components/portal/inventory/stock-levels-client.tsx

import { useState }    from "react";
import { useRouter }   from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Search, X, AlertTriangle, PackageX,
  CheckCircle, SlidersHorizontal, History,
  ChevronDown, ChevronRight, ArrowLeftRight,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────── */

interface Variant {
  id:    string;
  name:  string;
  stock: number;
  sku:   string | null;
}

interface Product {
  id:          string;
  name:        string;
  sku:         string | null;
  hasVariants: boolean;
  stock:       number;
  totalStock:  number;
  threshold:   number;
  status:      "ok" | "low" | "out";
  category:    { id: string; name: string } | null;
  variants:    Variant[];
}

interface Props {
  products:       Product[];
  siteId:         string;
  currencySymbol: string;
}

/* ── Status helpers ──────────────────────────────────────────── */

const STATUS_CONFIG = {
  ok:  { label: "In Stock",   color: "text-success", bg: "bg-success-muted", icon: CheckCircle    },
  low: { label: "Low Stock",  color: "text-warning",   bg: "bg-warning-muted/10",   icon: AlertTriangle  },
  out: { label: "Out of Stock", color: "text-danger",   bg: "bg-danger-muted",     icon: PackageX       },
};

/* ── Component ───────────────────────────────────────────────── */

export function StockLevelsClient({ products, siteId }: Props) {
  const router  = useRouter();
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "low" | "out">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = products.filter((p) => {
    if (filter === "low" && p.status !== "low") return false;
    if (filter === "out" && p.status !== "out") return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    }
    return true;
  });

  const lowCount = products.filter((p) => p.status === "low").length;
  const outCount = products.filter((p) => p.status === "out").length;

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <PageHeader title="Stock Levels" description="Current inventory levels across all products" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/portal/${siteId}/inventory/history`)}><History className="h-4 w-4" /> History</Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/portal/${siteId}/inventory/transfers`)}><ArrowLeftRight className="h-4 w-4" /> Transfers</Button>
          <Button onClick={() => router.push(`/portal/${siteId}/inventory/adjust`)}><SlidersHorizontal className="h-4 w-4" /> Adjust</Button>
        </div>
      </div>

      {/* Alert summary */}
      {(lowCount > 0 || outCount > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {outCount > 0 && (
            <button
              onClick={() => setFilter(filter === "out" ? "all" : "out")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2
                transition-all text-left ${
                filter === "out"
                  ? "border-danger bg-danger/5"
                  : "border-red-200 bg-danger/5 hover:border-red-400"
              }`}>
              <PackageX className="h-5 w-5 text-danger shrink-0" />
              <div>
                <p className="text-lg font-bold text-danger">{outCount}</p>
                <p className="text-xs text-danger">Out of stock</p>
              </div>
            </button>
          )}
          {lowCount > 0 && (
            <button
              onClick={() => setFilter(filter === "low" ? "all" : "low")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2
                transition-all text-left ${
                filter === "low"
                  ? "border-warning bg-warning-muted/30"
                  : "border-warning/30 bg-warning-muted/20 hover:border-warning/60"
              }`}>
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="text-lg font-bold text-warning">{lowCount}</p>
                <p className="text-xs text-warning">Low stock</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
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
        <div className="flex gap-1.5">
          {(["all", "low", "out"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}>
              {f === "all" ? "All" : f === "low" ? "Low" : "Out"}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <CheckCircle className="h-10 w-10 text-success" />
          <p className="font-medium">
            {filter !== "all" ? `No ${filter === "low" ? "low stock" : "out of stock"} products` : "No products found"}
          </p>
          {filter !== "all" && (
            <p className="text-sm text-muted-foreground">All products are well stocked 🎉</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((product) => {
            const cfg      = STATUS_CONFIG[product.status];
            const Icon     = cfg.icon;
            const isExpanded = expanded.has(product.id);

            return (
              <div key={product.id}
                className="border border-border rounded-2xl overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30
                    transition-colors cursor-pointer"
                  onClick={() => product.hasVariants && toggleExpand(product.id)}>

                  {/* Status icon */}
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center
                    justify-center shrink-0`}>
                    <Icon className={`h-4.5 w-4.5 ${cfg.color}`} />
                  </div>

                  {/* Name + sku */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {product.sku ?? product.category?.name ?? "—"}
                    </p>
                  </div>

                  {/* Stock count */}
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold tabular-nums ${cfg.color}`}>
                      {product.totalStock}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.hasVariants ? "total units" : "units"}
                    </p>
                  </div>

                  {/* Threshold badge */}
                  <div className="shrink-0 hidden sm:block">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Adjust quick-link */}
                  <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); router.push(`/portal/${siteId}/inventory/adjust?productId=${product.id}`); }}><SlidersHorizontal className="h-4 w-4" /></Button>

                  {/* Expand toggle for variants */}
                  {product.hasVariants && (
                    <div className="shrink-0 text-muted-foreground">
                      {isExpanded
                        ? <ChevronDown  className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </div>
                  )}
                </div>

                {/* Variants breakdown */}
                {product.hasVariants && isExpanded && (
                  <div className="border-t border-border bg-muted/20">
                    {product.variants.map((v, idx) => (
                      <div key={v.id}
                        className={`flex items-center gap-3 px-5 py-2.5 text-sm
                          ${idx < product.variants.length - 1 ? "border-b border-border/50" : ""}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
                        <span className="flex-1 text-muted-foreground">{v.name}</span>
                        {v.sku && (
                          <span className="text-xs text-muted-foreground font-mono">{v.sku}</span>
                        )}
                        <span className={`font-semibold tabular-nums ${
                          v.stock === 0 ? "text-danger" :
                          v.stock <= product.threshold ? "text-warning" : ""
                        }`}>
                          {v.stock}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {filtered.length} of {products.length} products
        </p>
      )}
    </div>
  );
}
