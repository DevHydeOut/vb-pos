"use client";

// src/components/portal/inventory/stock-entry-client.tsx
//
// Layout:
//   LEFT  (flex-1, scrollable grid) = product browser
//   RIGHT (fixed 360px, NO scroll)  = cart panel — header + items + footer
//
// The ONLY scroll in this page is:
//   • Left: product grid (overflow-y-auto)
//   • Right: cart items list (overflow-y-auto), but panel itself is fixed height

import { useState, useRef, useTransition, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowUp, ScanBarcode, Search, Plus, Minus,
  Package, Save, Printer, X, CheckCircle2, AlertCircle,
  MapPin, FileText, Info, ChevronDown, Clock, Eye, Receipt,
  ShoppingCart, Check,
} from "lucide-react";
import { createStockAdjustmentAction } from "@/actions/portal/stock";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/routes";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Variant {
  id: string; name: string; sku: string | null; barcode: string | null;
  costPrice: number | null; sellingPrice: number | null; stock: number;
}
interface Product {
  id: string; name: string; sku: string | null; barcode: string | null;
  costPrice: number | null; sellingPrice: number | null; stock: number;
  hasVariants: boolean; variants: Variant[];
  images: { url: string }[]; category: { name: string } | null;
}
interface CartItem {
  key: string; product: Product; variant: Variant | null;
  quantity: number; costPrice: number | null;
}
interface SiteInfo {
  id: string; name: string; address: string | null; phone: string | null;
  currencySymbol: string; taxRegistrationNumber: string | null;
  taxInclusive: boolean; logoUrl: string | null; receiptFooter: string | null;
}
interface Props {
  siteId: string; site: SiteInfo; products: Product[];
  timezone: string; recentProductIds: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MOV = {
  IN:  [
    { value: "PURCHASE",   label: "Purchase"       },
    { value: "RETURN",     label: "Return"          },
    { value: "ADJUSTMENT", label: "Correction (In)" },
  ],
  OUT: [
    { value: "DAMAGE",     label: "Damage / Loss"    },
    { value: "ADJUSTMENT", label: "Correction (Out)" },
    { value: "SALE",       label: "Manual Sale"      },
  ],
} as const;
type Dir = "IN" | "OUT";
const LOCS = ["Warehouse", "Store Floor", "Cold Storage", "Back Room", "Counter"];
const mk   = (pid: string, vid?: string | null) => vid ? `${pid}:${vid}` : pid;

// ─── Clock ────────────────────────────────────────────────────────────────────
function useClock(tz: string) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  }).format(now);
}

// ─── Compact Dropdown ─────────────────────────────────────────────────────────
function Dropdown({ label, value, options, onChange, accent }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  accent?: "green" | "orange";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const sel = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
          accent === "green"  ? "border-success bg-success-muted text-success-muted" :
          accent === "orange" ? "border-warning bg-warning-muted text-warning-muted" :
          "border-border bg-background text-foreground hover:bg-muted"
        }`}
      >
        <span className="text-muted-foreground mr-0.5 hidden sm:inline text-xs">{label}:</span>
        <span>{sel?.label ?? value}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-40 left-0 top-full mt-1.5 min-w-44 bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2 ${value === o.value ? "font-semibold" : ""}`}>
              {o.label}
              {value === o.value && <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field Dropdown (Location / Note) ─────────────────────────────────────────
function FieldDropdown({ icon: Icon, placeholder, value, onChange, presets }: {
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string; value: string;
  onChange: (v: string) => void;
  presets?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-background text-sm font-medium whitespace-nowrap hover:bg-muted transition-colors">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className={value ? "text-foreground max-w-24 truncate" : "text-muted-foreground text-sm"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-40 left-0 top-full mt-1.5 w-60 bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-2">
            <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
              className="w-full h-9 px-3 text-sm border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {value && (
            <button onMouseDown={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors border-t border-border">
              Clear
            </button>
          )}
          {presets && (
            <div className="border-t border-border">
              {presets.map(p => (
                <button key={p} onClick={() => { onChange(p); setOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors flex items-center justify-between">
                  {p}
                  {value === p && <Check className="h-4 w-4 text-foreground" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Product Modal ─────────────────────────────────────────────────────────────
// Opens top-aligned (not centered) — feels like a sheet dropping from top.
// Used for both card taps and barcode scans.
function ProductModal({ product, cur, showScanMore, onScanMore, onDone, onClose }: {
  product: Product; cur: string;
  showScanMore: boolean;
  onScanMore: (p: Product, v: Variant | null, qty: number, cost: number | null) => void;
  onDone:     (p: Product, v: Variant | null, qty: number, cost: number | null) => void;
  onClose:    () => void;
}) {
  const [variant,   setVariant]  = useState<Variant | null>(null);
  const [qty,       setQty]      = useState(1);
  const [cost,      setCost]     = useState(String(product.costPrice ?? ""));
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    setCost(String(variant?.costPrice ?? product.costPrice ?? ""));
  }, [variant, product]);

  const needsVariant = product.hasVariants && product.variants.length > 0;
  const canAdd       = !needsVariant || variant !== null;
  const totalStock   = needsVariant
    ? product.variants.reduce((s, v) => s + v.stock, 0)
    : product.stock;

  const commit = (andContinue: boolean) => {
    if (!canAdd) { setAttempted(true); return; }
    const c = cost === "" ? null : parseFloat(cost);
    if (andContinue) onScanMore(product, variant, qty, isNaN(c as number) ? null : c);
    else             onDone(product, variant, qty, isNaN(c as number) ? null : c);
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      {/* Modal — top-aligned, clicks inside don't close */}
      <div
        className="relative mx-auto mt-16 w-full max-w-130 bg-background rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header: product info + close ── */}
        <div className="flex items-center gap-4 px-6 pt-6 pb-5 border-b border-border">
          {/* Thumbnail */}
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
            {product.images[0]
              ? <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
              : <Package className="h-6 w-6 text-muted-foreground/40" />
            }
          </div>
          {/* Name + stock */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold leading-tight truncate">{product.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-sm font-semibold ${totalStock === 0 ? "text-danger" : "text-success"}`}>
                {totalStock} in stock
              </span>
              {product.category && (
                <span className="text-sm text-muted-foreground">· {product.category.name}</span>
              )}
            </div>
          </div>
          {/* Close */}
          <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5">

          {/* Variant picker */}
          {needsVariant && (
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Select Variant
              </p>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map(v => {
                  const selected = variant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => { setVariant(v); setAttempted(false); }}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/30 hover:bg-muted"
                      }`}
                    >
                      <span className="text-sm font-semibold truncate">{v.name}</span>
                      <span className={`text-sm font-bold shrink-0 ml-2 ${
                        selected ? "opacity-60" :
                        v.stock === 0 ? "text-danger" :
                        v.stock < 5  ? "text-warning" : "text-success"
                      }`}>
                        {v.stock}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cost + Quantity */}
          <div className="grid grid-cols-2 gap-4">
            {/* Cost */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Cost Price
              </p>
              <div className="flex items-center border-2 border-border rounded-2xl h-14 px-4 focus-within:border-foreground transition-colors bg-background">
                <span className="text-base text-muted-foreground font-semibold mr-1.5">{cur}</span>
                <input
                  type="number" min="0" step="0.01" value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 text-base font-bold bg-transparent outline-none placeholder:text-muted-foreground/40 tabular-nums"
                />
              </div>
            </div>
            {/* Quantity */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Quantity
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-14 h-14 rounded-2xl border-2 border-border flex items-center justify-center hover:bg-muted hover:border-foreground/30 active:scale-95 transition-all shrink-0 flex-none"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <input
                  type="number" min="1" value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-14 text-center border-2 border-border rounded-2xl text-xl font-bold bg-background outline-none focus:border-foreground transition-colors tabular-nums flex-none"
                />
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-14 h-14 rounded-2xl border-2 border-border flex items-center justify-center hover:bg-muted hover:border-foreground/30 active:scale-95 transition-all shrink-0 flex-none"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer: actions ── */}
        <div className="px-6 pb-6 space-y-2.5">
          {attempted && !canAdd && (
            <p className="text-sm text-danger text-center font-medium">
              Please select a variant to continue
            </p>
          )}
          <div className="flex gap-3">
            {showScanMore && (
              <Button variant="outline" size="lg" className="flex-1 text-base font-semibold h-13"
                onClick={() => commit(true)}>
                <ScanBarcode className="h-5 w-5" /> Scan More
              </Button>
            )}
            <Button size="lg" className="flex-1 h-13 text-base font-bold"
              onClick={() => commit(false)}>
              <ShoppingCart className="h-5 w-5" /> Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bill Content ─────────────────────────────────────────────────────────────
function BillContent({ site, cart, dir, movType, location, note, refNo, cur, tz }: {
  site: SiteInfo; cart: CartItem[]; dir: Dir; movType: string;
  location: string; note: string; refNo: string; cur: string; tz: string;
}) {
  const total = cart.reduce((s, i) => s + i.quantity * (i.costPrice ?? 0), 0);
  const date  = new Intl.DateTimeFormat("en-IN", {
    timeZone: tz, day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date());
  return (
    <div className="text-sm space-y-4">
      <div className="text-center space-y-0.5 pb-4 border-b border-border">
        {site.logoUrl && <img src={site.logoUrl} alt="" className="h-10 mx-auto mb-2 object-contain" />}
        <p className="font-bold text-base">{site.name}</p>
        {site.address && <p className="text-xs text-muted-foreground">{site.address}</p>}
        {site.phone   && <p className="text-xs text-muted-foreground">Tel: {site.phone}</p>}
      </div>
      <div className="space-y-1.5 pb-4 border-b border-border">
        {([
          ["Reference", refNo], ["Date", date],
          ["Type", `${dir === "IN" ? "Stock In" : "Stock Out"} — ${movType}`],
          ...(location ? [["Location", location]] : []),
          ...(note     ? [["Note",     note]]     : []),
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 text-xs">
            <span className="text-muted-foreground shrink-0">{k}</span>
            <span className="font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left pb-2 font-medium text-muted-foreground">Item</th>
            <th className="text-right pb-2 font-medium text-muted-foreground w-10">Qty</th>
            <th className="text-right pb-2 font-medium text-muted-foreground w-20">Rate</th>
            <th className="text-right pb-2 font-medium text-muted-foreground w-20">Amt</th>
          </tr>
        </thead>
        <tbody>
          {cart.map(i => (
            <tr key={i.key} className="border-b border-dashed border-border/40">
              <td className="py-2">
                <p className="font-medium">{i.product.name}</p>
                {i.variant && <p className="text-muted-foreground">{i.variant.name}</p>}
              </td>
              <td className="text-right py-2">{i.quantity}</td>
              <td className="text-right py-2">{i.costPrice != null ? `${cur}${i.costPrice.toFixed(2)}` : "—"}</td>
              <td className="text-right py-2 font-semibold">
                {i.costPrice != null ? `${cur}${(i.quantity * i.costPrice).toFixed(2)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        {total > 0 && (
          <tfoot>
            <tr className="border-t-2 border-foreground">
              <td colSpan={3} className="pt-3 text-right font-bold">TOTAL</td>
              <td className="pt-3 text-right font-bold">{cur}{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      <p className="text-xs text-center text-muted-foreground pt-2">
        {cart.reduce((s, i) => s + i.quantity, 0)} units · {cart.length} product{cart.length !== 1 ? "s" : ""}
      </p>
      {site.receiptFooter && (
        <p className="text-xs text-center text-muted-foreground pt-3 border-t border-border">
          {site.receiptFooter}
        </p>
      )}
    </div>
  );
}

// ─── Bill Modal ───────────────────────────────────────────────────────────────
function BillModal({ open, onClose, onPrint, ...p }: {
  open: boolean; onClose: () => void; onPrint: () => void;
  site: SiteInfo; cart: CartItem[]; dir: Dir; movType: string;
  location: string; note: string; refNo: string; cur: string; tz: string;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-start justify-center p-5 pt-16"
      onClick={onClose}>
      <div className="w-full max-w-100 bg-background rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <p className="font-bold text-base">Bill Preview</p>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{p.refNo}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <BillContent {...p} />
        </div>
      </div>
    </div>
  );
}

// ─── Print Node ───────────────────────────────────────────────────────────────
function PrintNode(p: { site: SiteInfo; cart: CartItem[]; dir: Dir; movType: string; location: string; note: string; refNo: string; cur: string; tz: string }) {
  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #stock-entry-print { display: block !important; }
          @page { size: 80mm auto; margin: 6mm; }
        }
      `}</style>
      <div id="stock-entry-print" style={{ display: "none" }}>
        <BillContent {...p} />
      </div>
    </>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd, cartQty, cur }: {
  product: Product; onAdd: (p: Product) => void; cartQty: number; cur: string;
}) {
  const displayStock = product.hasVariants && product.variants.length > 0
    ? product.variants.reduce((s, v) => s + v.stock, 0)
    : product.stock;

  const variantPrices = product.hasVariants
    ? product.variants.map(v => v.costPrice).filter((p): p is number => p !== null && p > 0)
    : [];
  const displayPrice   = variantPrices.length > 0 ? Math.min(...variantPrices) : product.costPrice;
  const showFromPrefix = variantPrices.length > 1;
  const isOutOfStock   = displayStock === 0;
  const isLowStock     = !isOutOfStock && displayStock < 5;

  return (
    <div
      onClick={() => onAdd(product)}
      className="group cursor-pointer rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-md transition-all overflow-hidden select-none relative"
    >
      {/* Cart qty badge */}
      {cartQty > 0 && (
        <div className="absolute top-2 right-2 z-10 min-w-5.5 h-5.5 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center px-1 shadow-sm">
          {cartQty}
        </div>
      )}
      {/* Image */}
      <div className="aspect-square bg-muted overflow-hidden relative">
        {product.images[0]
          ? <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground/25" />
            </div>
        }
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full">
              Out of stock
            </span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{product.name}</p>
        {product.category && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{product.category.name}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm font-bold">
            {displayPrice != null && displayPrice > 0
              ? <span>
                  {showFromPrefix && <span className="text-xs font-normal text-muted-foreground">from </span>}
                  {cur}{displayPrice.toFixed(2)}
                </span>
              : <span className="text-muted-foreground">—</span>
            }
          </p>
          <span className={`text-xs font-semibold tabular-nums ${
            isOutOfStock ? "text-danger" :
            isLowStock   ? "text-warning" : "text-success"
          }`}>
            {displayStock}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function StockEntryClient({ siteId, site, products, timezone, recentProductIds }: Props) {
  const router  = useRouter();
  const clock   = useClock(timezone);
  const cur     = site.currencySymbol;

  const [dir,         setDir]         = useState<Dir>("IN");
  const [movType,     setMovType]     = useState("PURCHASE");
  const [location,    setLocation]    = useState("");
  const [note,        setNote]        = useState("");
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [search,      setSearch]      = useState("");
  const [activeTag,   setActiveTag]   = useState("all");
  const [scanOpen,    setScanOpen]    = useState(false);
  const [scanProduct, setScanProduct] = useState<Product | null>(null);
  const [scanKeepOpen,setScanKeepOpen]= useState(false);
  const [preview,     setPreview]     = useState(false);
  const [saved,       setSaved]       = useState<{ ref: string; cart: CartItem[]; dir: Dir; mov: string } | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [clearConfirm,setClearConfirm]= useState(false);
  const [isPending,   startTx]        = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const types   = MOV[dir];
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const refLabel= `${dir === "IN" ? "GRN" : "STO"}-${dateTag}-XXXX`;

  const changeDir = (d: Dir) => { setDir(d); setMovType(MOV[d][0].value); };

  const categories = useMemo(() => {
    const s = new Set(products.map(p => p.category?.name).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [products]);

  const recentSet = useMemo(() => new Set(recentProductIds), [recentProductIds]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeTag === "recent")     list = list.filter(p => recentSet.has(p.id));
    else if (activeTag !== "all")   list = list.filter(p => p.category?.name === activeTag);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.variants.some(v => v.barcode?.toLowerCase().includes(q) || v.sku?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, activeTag, search, recentSet]);

  const commitAdd = useCallback((product: Product, variant: Variant | null, qty: number, cost: number | null) => {
    const key = mk(product.id, variant?.id);
    setCart(prev => {
      const ex = prev.find(i => i.key === key);
      if (ex) return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { key, product, variant, quantity: qty, costPrice: cost }];
    });
  }, []);

  const quickAdd = useCallback((product: Product) => {
    if (product.hasVariants && product.variants.length > 0) {
      setScanProduct(product);
      setScanKeepOpen(false);
    } else {
      commitAdd(product, null, 1, product.costPrice ?? null);
    }
  }, [commitAdd]);

  const handleScan = useCallback((code: string) => {
    let found: { product: Product; variant: Variant | null } | null = null;
    outer: for (const p of products) {
      if (p.barcode === code) { found = { product: p, variant: null }; break; }
      for (const v of p.variants) {
        if (v.barcode === code) { found = { product: p, variant: v }; break outer; }
      }
    }
    if (found) {
      setScanOpen(false);
      setScanProduct(found.product);
      setScanKeepOpen(true);
    } else {
      setScanOpen(false);
      setScanKeepOpen(false);
      setSearch(code);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [products]);

  const handleScanMore = (product: Product, variant: Variant | null, qty: number, cost: number | null) => {
    if (qty > 0) commitAdd(product, variant, qty, cost);
    setScanProduct(null);
    setScanOpen(true);
  };

  const handleScanDone = (product: Product, variant: Variant | null, qty: number, cost: number | null) => {
    if (qty > 0) commitAdd(product, variant, qty, cost);
    setScanProduct(null);
  };

  const setQty  = (k: string, n: number) => { if (n < 1) return; setCart(p => p.map(i => i.key === k ? { ...i, quantity: n } : i)); };
  const setCost = (k: string, v: string) => { const n = v === "" ? null : parseFloat(v); setCart(p => p.map(i => i.key === k ? { ...i, costPrice: isNaN(n as number) ? null : n } : i)); };
  const remove  = (k: string) => setCart(p => p.filter(i => i.key !== k));

  const totalUnits = cart.reduce((s, i) => s + i.quantity, 0);
  const totalCost  = cart.reduce((s, i) => s + i.quantity * (i.costPrice ?? 0), 0);

  const bp = (c: CartItem[], r: string, d: Dir, m: string) => ({
    site, cart: c, dir: d, movType: m, location, note, refNo: r, cur, tz: timezone,
  });

  const handleSave = () => {
    if (!cart.length) return;
    setError(null);
    startTx(async () => {
      const noteText = note || `${dir === "IN" ? "Stock In" : "Stock Out"}${location ? ` — ${location}` : ""}`;
      const res = await Promise.all(cart.map(item => {
        const fd = new FormData();
        fd.append("productId", item.product.id);
        fd.append("variantId", item.variant?.id ?? "");
        fd.append("type",      movType);
        fd.append("quantity",  String(dir === "OUT" ? -item.quantity : item.quantity));
        fd.append("note",      noteText);
        return createStockAdjustmentAction(siteId, fd);
      }));
      const fail = res.find(r => !r.success);
      if (fail && !fail.success) { setError(fail.error); return; }
      const ref = `${dir === "IN" ? "GRN" : "STO"}-${dateTag}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      setSaved({ ref, cart: [...cart], dir, mov: movType });
      setCart([]);
    });
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (saved) {
    return (
      <>
        <BillModal open={preview} onClose={() => setPreview(false)} onPrint={() => window.print()} {...bp(saved.cart, saved.ref, saved.dir, saved.mov)} />
        <PrintNode {...bp(saved.cart, saved.ref, saved.dir, saved.mov)} />
        <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-success-muted flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold">
              Stock {saved.dir === "IN" ? "received" : "recorded"} successfully
            </p>
            <p className="text-base font-mono text-muted-foreground">{saved.ref}</p>
            <p className="text-sm text-muted-foreground">
              {saved.cart.reduce((s, i) => s + i.quantity, 0)} units · {saved.cart.length} product{saved.cart.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="outline" onClick={() => setPreview(true)}>
              <Eye className="h-4 w-4" /> Preview Bill
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
            <Button onClick={() => { setSaved(null); setNote(""); setLocation(""); }}>
              <Plus className="h-4 w-4" /> New Entry
            </Button>
            <Button variant="outline" onClick={() => router.push(ROUTES.staff.inventory.stock(siteId))}>
              View Stock
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ── Main Layout ─────────────────────────────────────────────────────────────
  return (
    <>
      <BarcodeScanner open={scanOpen} onClose={() => { setScanOpen(false); setScanKeepOpen(false); }} onScan={handleScan} continuous />

      {scanProduct && (
        <ProductModal
          product={scanProduct}
          cur={cur}
          showScanMore={scanKeepOpen}
          onScanMore={handleScanMore}
          onDone={handleScanDone}
          onClose={() => setScanProduct(null)}
        />
      )}

      <BillModal open={preview} onClose={() => setPreview(false)} onPrint={() => window.print()} {...bp(cart, refLabel, dir, movType)} />
      <PrintNode {...bp(cart, refLabel, dir, movType)} />

      {/* ── Clear confirm ── */}
      {clearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-start justify-center p-5 pt-24"
          onClick={() => setClearConfirm(false)}>
          <div className="w-full max-w-sm bg-background rounded-3xl shadow-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <p className="text-lg font-bold text-center">Clear cart?</p>
            <p className="text-sm text-muted-foreground text-center">
              This will remove all {cart.length} item{cart.length !== 1 ? "s" : ""}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setClearConfirm(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => { setCart([]); setClearConfirm(false); }}>Clear</Button>
            </div>
          </div>
        </div>
      )}

      {/*
        ══════════════════════════════════════════════════════════════
        PAGE LAYOUT — h-[calc(100vh-4rem)] with NO page-level scroll.
        
        LEFT  (flex-1) = product browser — only the grid div scrolls
        RIGHT (360px)  = cart panel — only cart items list scrolls
        Both panels are fixed height. Nothing outside them scrolls.
        ══════════════════════════════════════════════════════════════
      */}
      <div className="fixed inset-x-0 top-16 bottom-0 flex overflow-hidden">

        {/* ████████  LEFT — Product Browser  ████████ */}
        {/* flex-col so children stack vertically. overflow-hidden = no outer scroll */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-border">

          {/* Row 1 — Controls (fixed height, never scrolls) */}
          <div className="shrink-0 px-4 py-3 border-b border-border bg-background">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Stock In / Out toggle */}
              <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
                <button
                  onClick={() => changeDir("IN")}
                  className={`flex items-center gap-2 h-10 px-4 text-sm font-bold transition-all ${
                    dir === "IN" ? "bg-success text-success-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ArrowDown className="h-4 w-4" /> Stock In
                </button>
                <button
                  onClick={() => changeDir("OUT")}
                  className={`flex items-center gap-2 h-10 px-4 text-sm font-bold border-l border-border transition-all ${
                    dir === "OUT" ? "bg-warning text-warning-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ArrowUp className="h-4 w-4" /> Stock Out
                </button>
              </div>

              <Dropdown
                label="Type" value={movType}
                options={types.map(t => ({ value: t.value, label: t.label }))}
                onChange={setMovType}
                accent={dir === "IN" ? "green" : "orange"}
              />
              <FieldDropdown icon={MapPin} placeholder="Location" value={location} onChange={setLocation} presets={LOCS} />
              <FieldDropdown icon={FileText} placeholder="Note" value={note} onChange={setNote} />
            </div>
          </div>

          {/* Row 2 — Search + Clock + Ref (fixed height) */}
          <div className="shrink-0 px-4 py-3 border-b border-border bg-background">
            <div className="flex items-center gap-3">
              {/* Search — takes most of the width */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center border border-border rounded-xl h-11 overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                  <span className="pl-3 text-muted-foreground shrink-0"><Search className="h-4 w-4" /></span>
                  <input
                    ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, SKU or barcode…"
                    className="flex-1 h-full px-2.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="pr-2 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setScanOpen(true)}
                    className="h-full px-3.5 flex items-center gap-1.5 bg-muted/60 hover:bg-muted border-l border-border text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold shrink-0"
                  >
                    <ScanBarcode className="h-4 w-4" /><span className="hidden md:inline">Scan</span>
                  </button>
                </div>
              </div>
              {/* Clock */}
              <div className="flex items-center gap-1.5 h-11 px-3 border border-border rounded-xl text-sm text-muted-foreground shrink-0">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="font-mono tabular-nums">{clock}</span>
              </div>
              {/* Ref */}
              <div className="hidden lg:flex items-center gap-1.5 h-11 px-3 border border-dashed border-border rounded-xl text-sm text-muted-foreground shrink-0 font-mono">
                {refLabel}
              </div>
            </div>
          </div>

          {/* Row 3 — Category tags (fixed height) */}
          <div className="shrink-0 px-4 py-3 border-b border-border bg-background">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {[
                { key: "all",    label: `All Products (${products.length})` },
                { key: "recent", label: `Recent (${recentProductIds.length})` },
                ...categories.map(c => ({ key: c, label: `${c} (${products.filter(p => p.category?.name === c).length})` })),
              ].map(tag => (
                <button
                  key={tag.key}
                  onClick={() => setActiveTag(tag.key)}
                  className={`flex-none px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                    activeTag === tag.key ? "pill-active border-foreground" : "pill-inactive border-border hover:border-foreground/30"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid — THIS IS THE ONLY SCROLLABLE AREA ON THE LEFT */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <Package className="h-14 w-14 text-muted-foreground/15" />
                <p className="text-base font-semibold text-muted-foreground">
                  {activeTag === "recent" ? "No recent products" : search.trim() ? `No results for "${search}"` : "No products found"}
                </p>
                <p className="text-sm text-muted-foreground/60">
                  {activeTag === "recent" ? "Products you add stock for will appear here" : "Try a different search term"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {filtered.map(p => {
                  const cartQty = cart.filter(i => i.product.id === p.id).reduce((s, i) => s + i.quantity, 0);
                  return <ProductCard key={p.id} product={p} onAdd={quickAdd} cartQty={cartQty} cur={cur} />;
                })}
              </div>
            )}
          </div>
        </div>

        {/* ████████  RIGHT — Cart Panel  ████████ */}
        {/* Fixed width. overflow-hidden on outer. ONLY cart items div scrolls inside. */}
        <div className="w-90 shrink-0 flex flex-col bg-background overflow-hidden">

          {/* Cart header — fixed, never scrolls */}
          <div className="shrink-0 px-4 py-4 border-b border-border bg-muted/20">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 min-w-0">
                {/* Status badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${
                    dir === "IN"
                      ? "bg-success-muted text-success-muted"
                      : "bg-warning-muted text-warning-muted"
                  }`}>
                    {dir === "IN" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                    Stock {dir === "IN" ? "In" : "Out"}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    {types.find(t => t.value === movType)?.label}
                  </span>
                </div>
                {/* Location + ref */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />{location}
                    </span>
                  )}
                  <span className="font-mono text-xs">
                    <Info className="h-3 w-3 inline mr-1" />{refLabel}
                  </span>
                </div>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setClearConfirm(true)}
                  className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Cart items — ONLY THIS SCROLLS on the right side */}
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <EmptyState icon={Receipt} title="Cart is empty" description="Tap a product to add it" size="sm" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {cart.map(item => {
                const avail   = item.variant ? item.variant.stock : item.product.stock;
                const over    = dir === "OUT" && item.quantity > avail;
                const lineAmt = item.costPrice != null ? item.quantity * item.costPrice : null;
                return (
                  <div key={item.key} className={`px-4 py-3.5 ${over ? "bg-warning-muted/30" : ""}`}>
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-xl border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {item.product.images[0]
                          ? <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                          : <Package className="h-4 w-4 text-muted-foreground/40" />
                        }
                      </div>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate">{item.product.name}</p>
                            {item.variant && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.variant.name}</p>
                            )}
                          </div>
                          <Button variant="ghost" size="icon-xs" onClick={() => remove(item.key)}
                            className="text-muted-foreground hover:text-destructive shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {over && (
                          <p className="text-xs text-warning flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3" /> Exceeds available stock ({avail})
                          </p>
                        )}
                        {/* Cost + Qty controls */}
                        <div className="flex items-center gap-2 mt-2">
                          {/* Cost input */}
                          <div className="flex items-center border border-border rounded-lg h-8 px-2.5 bg-background flex-1 min-w-0">
                            <span className="text-xs text-muted-foreground shrink-0 mr-1">{cur}</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={item.costPrice ?? ""}
                              onChange={e => setCost(item.key, e.target.value)}
                              placeholder="0.00"
                              className="flex-1 text-sm font-semibold bg-transparent outline-none min-w-0 placeholder:text-muted-foreground/40 tabular-nums"
                            />
                          </div>
                          {/* Qty stepper */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setQty(item.key, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className={`w-8 text-center text-sm font-bold tabular-nums ${over ? "text-warning" : ""}`}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => setQty(item.key, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          {/* Line amount */}
                          {lineAmt != null && (
                            <span className="text-sm font-bold tabular-nums ml-auto shrink-0">
                              {cur}{lineAmt.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cart footer — fixed at bottom, never scrolls */}
          <div className="shrink-0 border-t border-border p-4 space-y-3 bg-background">
            {/* Totals */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Items</span>
                <span className="font-medium text-foreground">{cart.length} · {totalUnits} units</span>
              </div>
              {totalCost > 0 && (
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-xl font-bold tabular-nums">{cur} {totalCost.toFixed(2)}</span>
                </div>
              )}
            </div>
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-danger-muted text-danger-muted text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setPreview(true)}
                disabled={!cart.length}
                className="shrink-0 font-semibold"
              >
                <Eye className="h-4 w-4" /> Bill
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !cart.length}
                className={`flex-1 py-3 text-base font-bold ${
                  dir === "IN" ? "bg-success text-success-foreground hover:bg-success/90" : "bg-warning text-warning-foreground hover:bg-warning/90"
                }`}
              >
                <Save className="h-4 w-4" />
                {isPending ? "Saving…" : dir === "IN" ? "Confirm Stock In" : "Confirm Stock Out"}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
