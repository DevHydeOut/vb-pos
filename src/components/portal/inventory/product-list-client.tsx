"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter }  from "next/navigation";
import { toast }      from "sonner";
import {
  softDeleteProductAction,
  pushProductsToSitesAction,
} from "@/actions/portal/product";
import {
  Search, Plus, ScanBarcode, X, Filter,
  MoreHorizontal, Trash2, Copy, ChevronDown,
  Package, AlertTriangle, CheckCircle, XCircle,
  Loader2,
} from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Badge }   from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";
import { EmptyState } from "@/components/shared/empty-state";

/* ── Types ───────────────────────────────────────────────────── */

interface ProductVariant {
  id:           string;
  name:         string;
  barcode:      string | null;
  stock:        number;
  sellingPrice: number | null;
  isActive:     boolean;
  deletedAt:    Date | null;
}

interface ProductImage {
  id:        string;
  url:       string;
  sortOrder: number;
}

interface Product {
  id:                string;
  name:              string;
  description:       string | null;
  sku:               string | null;
  barcode:           string | null;
  costPrice:         number | null;
  sellingPrice:      number | null;
  stock:             number;
  lowStockThreshold: number | null;
  hasVariants:       boolean;
  isActive:          boolean;
  isGlobal:          boolean;
  category:          { id: string; name: string } | null;
  taxGroup:          { id: string; name: string } | null;
  images:            ProductImage[];
  variants:          ProductVariant[];
}

interface SiteSimple { id: string; name: string }

/* ── Helpers ─────────────────────────────────────────────────── */

function getProductStatus(product: Product): "active" | "inactive" | "low_stock" | "out_of_stock" {
  if (!product.isActive) return "inactive";
  const stock = product.hasVariants
    ? product.variants.filter((v) => !v.deletedAt && v.isActive).reduce((s, v) => s + v.stock, 0)
    : product.stock;
  if (stock === 0) return "out_of_stock";
  const threshold = product.lowStockThreshold ?? 5;
  if (stock <= threshold) return "low_stock";
  return "active";
}

function StatusBadge({ status }: { status: ReturnType<typeof getProductStatus> }) {
  const map = {
    active:       { label: "Active",       icon: CheckCircle,  cls: "bg-success-muted text-green-700 dark:bg-success-muted dark:text-success" },
    inactive:     { label: "Inactive",     icon: XCircle,      cls: "bg-muted text-muted-foreground" },
    low_stock:    { label: "Low Stock",    icon: AlertTriangle, cls: "bg-warning-muted text-warning dark:bg-warning-muted dark:text-warning" },
    out_of_stock: { label: "Out of Stock", icon: XCircle,       cls: "bg-danger-muted text-danger-muted dark:bg-danger-muted dark:text-danger" },
  };
  const { label, icon: Icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

/* ── Push Modal ──────────────────────────────────────────────── */

function PushModal({ open, onClose, products, allSites, onSuccess }: {
  open:      boolean;
  onClose:   () => void;
  products:  Product[];
  allSites:  SiteSimple[];
  onSuccess: () => void;
}) {
  const [selected,    setSelected]    = useState<string[]>([]);
  const [isPushing,   startPush]      = useTransition();

  function toggle(siteId: string) {
    setSelected((p) => p.includes(siteId) ? p.filter((s) => s !== siteId) : [...p, siteId]);
  }

  function handlePush() {
    if (!selected.length) { toast.error("Select at least one site"); return; }
    startPush(async () => {
      const res = await pushProductsToSitesAction(products.map((p) => p.id), selected);
      if (res.success) {
        toast.success(`Pushed to ${selected.length} site${selected.length > 1 ? "s" : ""}`);
        setSelected([]);
        onSuccess();
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-background
        border border-border rounded-2xl shadow-2xl max-w-sm mx-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Push to Sites</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground">
          Pushing <strong>{products.length}</strong> product{products.length > 1 ? "s" : ""}.
          Select sites to receive them.
        </p>
        <div className="space-y-1 max-h-52 overflow-y-auto">
          <button onClick={() => setSelected(selected.length === allSites.length ? [] : allSites.map((s) => s.id))}
            className="w-full text-left text-xs text-muted-foreground px-3 py-1.5 hover:text-foreground">
            {selected.length === allSites.length ? "Deselect all" : "Select all"}
          </button>
          {allSites.map((site) => (
            <button key={site.id} onClick={() => toggle(site.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl
                text-sm transition-colors ${selected.includes(site.id)
                  ? "bg-foreground text-background"
                  : "hover:bg-muted"}`}>
              {site.name}
              {selected.includes(site.id) && <CheckCircle className="h-4 w-4" />}
            </button>
          ))}
        </div>
        <Button onClick={handlePush} disabled={isPushing || !selected.length} className="w-full">
          {isPushing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Push to {selected.length || "..."} site{selected.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export function ProductListClient({
  products: initial,
  allSites,
  categories,
  siteId,
  siteName,
  isMaster,
}: {
  products:   Product[];
  allSites:   SiteSimple[];
  categories: { id: string; name: string }[];
  siteId:     string | null;
  siteName:   string;
  isMaster:   boolean;
}) {
  const router = useRouter();
  const [products,      setProducts]      = useState(initial);
  const [query,         setQuery]         = useState("");
  const [categoryFilter,setCategoryFilter]= useState("all");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [selected,      setSelected]      = useState<string[]>([]);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [pushOpen,      setPushOpen]      = useState(false);
  const [scanOpen,      setScanOpen]      = useState(false);
  const [isDeleting,    startDelete]      = useTransition();

  const newPath = siteId
    ? `/portal/${siteId}/inventory/products/new`
    : `/dashboard/manage/products/new`;

  const editPath = (id: string) => siteId
    ? `/portal/${siteId}/inventory/products/${id}`
    : `/dashboard/manage/products/${id}`;

  // Filter products
  const filtered = products.filter((p) => {
    const q = query.toLowerCase();
    const matchQuery = !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q);
    const matchCategory = categoryFilter === "all" || p.category?.id === categoryFilter;
    const status = getProductStatus(p);
    const matchStatus = statusFilter === "all" || status === statusFilter;
    return matchQuery && matchCategory && matchStatus;
  });

  function toggleSelect(id: string) {
    setSelected((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);
  }

  function handleDelete() {
    if (!deleteId) return;
    startDelete(async () => {
      const res = await softDeleteProductAction(deleteId, siteId);
      if (res.success) {
        setProducts((p) => p.filter((x) => x.id !== deleteId));
        toast.success("Product deleted");
      } else {
        toast.error(res.error);
      }
      setDeleteId(null);
    });
  }

  // Barcode scan — find matching product and navigate to it
  function handleScan(barcode: string) {
    setScanOpen(false);
    const trimmed = barcode.trim();
    // Check product-level barcode first, then variant-level barcodes
    const match = products.find(
      (p) => p.barcode === trimmed || p.variants.some((v) => v.barcode === trimmed)
    );
    if (match) {
      toast.success(`Found: ${match.name}`);
      router.push(editPath(match.id));
    } else {
      toast.info(`No product found for barcode: ${trimmed}`);
    }
  }

  const pushTargets = isMaster && selected.length > 0
    ? products.filter((p) => selected.includes(p.id))
    : [];

  // Total stock display
  function stockDisplay(p: Product) {
    if (p.hasVariants) {
      const total = p.variants.filter((v) => !v.deletedAt && v.isActive).reduce((s, v) => s + v.stock, 0);
      return `${total} (${p.variants.filter((v) => !v.deletedAt).length} variants)`;
    }
    return String(p.stock);
  }

  return (
    <div className="space-y-5">

      {/* ── Toolbar ──────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU, barcode..." className="h-10 pl-11" />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-2">
              <Filter className="h-4 w-4" />
              {categoryFilter === "all" ? "Category" : categories.find((c) => c.id === categoryFilter)?.name}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => setCategoryFilter("all")}>All categories</DropdownMenuItem>
            <DropdownMenuSeparator />
            {categories.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => setCategoryFilter(c.id)}>
                {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-2">
              {statusFilter === "all" ? "Status" : statusFilter.replace("_", " ")}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {["all", "active", "inactive", "low_stock", "out_of_stock"].map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                {s === "all" ? "All statuses" : s.replace("_", " ")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Barcode scanner */}
        <Button variant="outline" className="h-10 gap-2" onClick={() => setScanOpen(true)}>
          <ScanBarcode className="h-4 w-4" /> Scan
        </Button>

        {/* Push selected */}
        {isMaster && selected.length > 0 && (
          <Button variant="outline" className="h-10 gap-2" onClick={() => setPushOpen(true)}>
            <Copy className="h-4 w-4" /> Push {selected.length}
          </Button>
        )}

        {/* New product */}
        <Button className="h-10 gap-2" onClick={() => router.push(newPath)}>
          <Plus className="h-4 w-4" /> New Product
        </Button>
      </div>

      {/* ── Product list ─────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 text-center">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-semibold">No products found</p>
          <p className="text-sm text-muted-foreground">
            {query ? "Try a different search" : "Add your first product to get started"}
          </p>
          <Button onClick={() => router.push(newPath)} className="gap-2">
            <Plus className="h-4 w-4" /> New Product
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center
            gap-4 px-4 py-3 bg-muted/40 border-b border-border text-xs
            font-semibold text-muted-foreground uppercase tracking-widest">
            <div className="w-5" />
            <span>Product</span>
            <span className="w-28 text-right">Price</span>
            <span className="w-24 text-right">Stock</span>
            <span className="w-24">Status</span>
            <span className="w-8" />
          </div>

          {/* Rows */}
          {filtered.map((product) => {
            const status = getProductStatus(product);
            const thumb  = product.images.sort((a, b) => a.sortOrder - b.sortOrder)[0];
            const isSelected = selected.includes(product.id);

            return (
              <div key={product.id}
                className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center
                  gap-4 px-4 py-3 border-b border-border last:border-0 transition-colors
                  hover:bg-muted/30 ${isSelected ? "bg-muted/50" : ""}`}>

                {/* Checkbox */}
                {isMaster ? (
                  <input type="checkbox" checked={isSelected}
                    onChange={() => toggleSelect(product.id)}
                    className="w-4 h-4 rounded accent-foreground cursor-pointer" />
                ) : <div className="w-4" />}

                {/* Name + meta */}
                <button onClick={() => router.push(editPath(product.id))}
                  className="flex items-center gap-3 text-left min-w-0">
                  {thumb ? (
                    <img src={thumb.url} alt={product.name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center
                      justify-center shrink-0 border border-border">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {product.sku && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {product.sku}
                        </span>
                      )}
                      {product.category && (
                        <span className="text-xs text-muted-foreground">
                          {product.category.name}
                        </span>
                      )}
                      {product.hasVariants && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-lg text-muted-foreground">
                          {product.variants.filter((v) => !v.deletedAt).length} variants
                        </span>
                      )}
                      {product.isGlobal && (
                        <span className="text-xs bg-foreground/10 px-1.5 py-0.5 rounded-lg text-foreground/60">
                          Global
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Price */}
                <div className="w-28 text-right">
                  {product.hasVariants ? (
                    <span className="text-xs text-muted-foreground">per variant</span>
                  ) : product.sellingPrice != null ? (
                    <span className="text-sm font-semibold">
                      {product.sellingPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                {/* Stock */}
                <div className="w-24 text-right">
                  <span className={`text-sm font-medium ${
                    status === "out_of_stock" ? "text-destructive" :
                    status === "low_stock"    ? "text-warning dark:text-warning" :
                    "text-foreground"
                  }`}>
                    {stockDisplay(product)}
                  </span>
                </div>

                {/* Status badge */}
                <div className="w-24">
                  <StatusBadge status={status} />
                </div>

                {/* Actions */}
                <div className="w-8">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 flex items-center justify-center rounded-xl
                        hover:bg-muted transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => router.push(editPath(product.id))}>
                        Edit
                      </DropdownMenuItem>
                      {isMaster && (
                        <DropdownMenuItem onClick={() => {
                          setSelected([product.id]);
                          setPushOpen(true);
                        }}>
                          <Copy className="mr-2 h-4 w-4" /> Push to sites
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteId(product.id)}
                        disabled={product.isGlobal && !isMaster}
                        className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Barcode scanner modal ─────────────────────── */}
      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />

      {/* ── Push modal ───────────────────────────────── */}
      <PushModal
        open={pushOpen}
        onClose={() => { setPushOpen(false); setSelected([]); }}
        products={pushTargets}
        allSites={allSites}
        onSuccess={() => setSelected([])}
      />

      {/* ── Delete confirm ───────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This product will be removed. Sales history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}
              className="rounded-xl bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}