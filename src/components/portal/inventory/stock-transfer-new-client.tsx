"use client";

// src/components/portal/inventory/stock-transfer-new-client.tsx

import { useState, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ScanBarcode, ArrowRight, Plus, Minus, Trash2, Package,
  ChevronDown, Send, X, CheckCircle2, AlertCircle, Building2,
} from "lucide-react";
import { createStockTransferAction, type TransferLineItem } from "@/actions/portal/stock-transfer";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { ROUTES } from "@/routes";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ProductVariant {
  id:          string;
  name:        string;
  sku:         string | null;
  barcode:     string | null;
  costPrice:   number | null;
  stock:       number;
}

interface Product {
  id:           string;
  name:         string;
  sku:          string | null;
  barcode:      string | null;
  costPrice:    number | null;
  stock:        number;
  hasVariants:  boolean;
  variants:     ProductVariant[];
  images:       { url: string }[];
}

interface Site {
  id:   string;
  name: string;
}

interface CartItem {
  key:       string;
  product:   Product;
  variant:   ProductVariant | null;
  quantity:  number;
  costPrice: number | null;
}

interface StockTransferNewClientProps {
  siteId:        string;
  siteName:      string;
  otherSites:    Site[];
  products:      Product[];
  currency:      string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getItemKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function StockTransferNewClient({
  siteId,
  siteName,
  otherSites,
  products,
  currency,
}: StockTransferNewClientProps) {
  const router = useRouter();

  const [toSiteId, setToSiteId]             = useState<string>(otherSites[0]?.id ?? "");
  const [cart, setCart]                     = useState<CartItem[]>([]);
  const [search, setSearch]                 = useState("");
  const [showResults, setShowResults]       = useState(false);
  const [activeVariant, setActiveVariant]   = useState<{ productId: string } | null>(null);
  const [note, setNote]                     = useState("");
  const [generateBill, setGenerateBill]     = useState(false);

  const [saved, setSaved]                   = useState<{ id: string; referenceNo: string } | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [isPending, startTransition]        = useTransition();

  const searchRef = useRef<HTMLInputElement>(null);

  const toSite = otherSites.find((s) => s.id === toSiteId);

  // ── Search ──────────────────────────────────────────────────

  const searchResults = search.trim().length < 1 ? [] : products.filter((p) => {
    const q = search.toLowerCase();
    if (p.name.toLowerCase().includes(q))     return true;
    if (p.sku?.toLowerCase().includes(q))     return true;
    if (p.barcode?.toLowerCase().includes(q)) return true;
    if (p.variants.some((v) =>
      v.barcode?.toLowerCase().includes(q) || v.sku?.toLowerCase().includes(q)
    )) return true;
    return false;
  }).slice(0, 8);

  // ── Cart ────────────────────────────────────────────────────

  const addToCart = useCallback((product: Product, variant: ProductVariant | null = null) => {
    const key = getItemKey(product.id, variant?.id);
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { key, product, variant, quantity: 1, costPrice: variant?.costPrice ?? product.costPrice ?? null }];
    });
    setSearch("");
    setShowResults(false);
    setActiveVariant(null);
    searchRef.current?.focus();
  }, []);

  const onSelectProduct = (product: Product) => {
    if (product.hasVariants && product.variants.length > 0) {
      setActiveVariant({ productId: product.id });
    } else {
      addToCart(product, null);
    }
  };

  const setQty = (key: string, qty: number) => {
    if (qty < 1) return;
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, quantity: qty } : i));
  };

  const setCostPrice = (key: string, price: string) => {
    const val = price === "" ? null : parseFloat(price);
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, costPrice: isNaN(val as number) ? null : val } : i));
  };

  const removeItem = (key: string) => setCart((prev) => prev.filter((i) => i.key !== key));

  // Warn if qty > available stock
  const getStockWarning = (item: CartItem) => {
    const available = item.variant ? item.variant.stock : item.product.stock;
    return item.quantity > available ? available : null;
  };

  const totalUnits = cart.reduce((s, i) => s + i.quantity, 0);
  const totalCost  = cart.reduce((s, i) => s + i.quantity * (i.costPrice ?? 0), 0);
  const hasWarning = cart.some((i) => getStockWarning(i) !== null);

  // ── Send ────────────────────────────────────────────────────

  const handleSend = () => {
    if (!toSiteId) return;
    setError(null);
    startTransition(async () => {
      const items: TransferLineItem[] = cart.map((i) => ({
        productId:  i.product.id,
        variantId:  i.variant?.id ?? null,
        quantity:   i.quantity,
        costPrice:  i.costPrice,
      }));
      const res = await createStockTransferAction(siteId, toSiteId, items, {
        note:         note || undefined,
        generateBill,
      });
      if (res.success && res.data) {
        setSaved(res.data);
        setCart([]);
      } else if (!res.success) {
        setError(res.error);
      }
    });
  };

  const activeProduct = activeVariant
    ? products.find((p) => p.id === activeVariant.productId) ?? null
    : null;

  // ── Success screen ──────────────────────────────────────────

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-success-muted flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">Transfer sent successfully</p>
          <p className="text-sm text-muted-foreground">
            {toSite?.name} will be notified to accept or reject.
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-1">{saved.referenceNo}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(ROUTES.staff.inventory.transfers(siteId))}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
          >
            View All Transfers
          </button>
          <Button onClick={() => { setSaved(null); setNote(""); }}>
            <Plus className="h-4 w-4" /> New Transfer
          </Button>
        </div>
      </div>
    );
  }

  if (otherSites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No other active sites to transfer to.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-32">
      {/* ── From → To ── */}
      <div className="flex items-center gap-3 p-4 border border-border rounded-2xl bg-muted/30">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">From</p>
          <p className="text-sm font-semibold truncate">{siteName}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">To</p>
          <select
            value={toSiteId}
            onChange={(e) => setToSiteId(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none cursor-pointer focus:ring-2 focus:ring-ring"
          >
            {otherSites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Options ── */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={generateBill}
            onChange={(e) => setGenerateBill(e.target.checked)}
            className="rounded"
          />
          Generate Transfer Bill
        </label>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ScanBarcode className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder="Scan barcode or search product..."
          className="w-full h-11 pl-10 pr-4 border border-border rounded-xl text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />

        {showResults && searchResults.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
            {searchResults.map((product) => {
              const insufficient = product.stock === 0;
              return (
                <button
                  key={product.id}
                  onMouseDown={() => onSelectProduct(product)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left ${insufficient ? "opacity-60" : ""}`}
                >
                  {product.images[0] ? (
                    <img src={product.images[0].url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.sku && <span className="mr-2">SKU: {product.sku}</span>}
                      <span className={product.stock === 0 ? "text-danger" : "text-success"}>
                        Stock: {product.stock}
                      </span>
                      {product.hasVariants && <span className="ml-2 text-info">{product.variants.length} variants</span>}
                    </p>
                  </div>
                  {product.hasVariants && <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Cart ── */}
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center border border-dashed border-border rounded-2xl">
          <ScanBarcode className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Scan or search products to add to this transfer</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Product</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Cost ({currency})</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Available</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cart.map((item) => {
                const available = item.variant ? item.variant.stock : item.product.stock;
                const overStock = item.quantity > available;
                return (
                  <tr key={item.key} className={`hover:bg-muted/20 ${overStock ? "bg-warning-muted/30" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.product.name}</p>
                      {item.variant && <p className="text-xs text-muted-foreground">{item.variant.name}</p>}
                      {overStock && (
                        <p className="text-xs text-warning flex items-center gap-1 mt-0.5">
                          <AlertCircle className="h-3 w-3" />
                          Exceeds available stock ({available})
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        value={item.costPrice ?? ""}
                        onChange={(e) => setCostPrice(item.key, e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-24 text-right h-8 px-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setQty(item.key, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setQty(item.key, parseInt(e.target.value) || 1)}
                          min="1"
                          className={`w-16 text-center h-8 border rounded-lg text-sm bg-background font-medium focus:outline-none focus:ring-2 focus:ring-ring ${overStock ? "border-orange-400" : "border-border"}`}
                        />
                        <button
                          onClick={() => setQty(item.key, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium text-xs ${overStock ? "text-warning" : "text-muted-foreground"}`}>
                      {available}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon-xs" onClick={() => removeItem(item.key)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td className="px-4 py-3 text-sm font-medium">{cart.length} product{cart.length !== 1 ? "s" : ""}</td>
                <td />
                <td className="px-4 py-3 text-center text-sm font-medium">{totalUnits} units</td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
          {totalCost > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-sm">
              <span className="text-muted-foreground">Total Transfer Value</span>
              <span className="font-semibold">{currency} {totalCost.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Note ── */}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional - visible to recipient)"
        className="w-full h-9 px-3 border border-border rounded-xl text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Send button (fixed bottom) ── */}
      {cart.length > 0 && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-10 flex justify-center pointer-events-none">
          <Button onClick={handleSend} disabled={isPending || !toSiteId}
            className="pointer-events-auto px-8 py-3.5 rounded-2xl font-semibold shadow-lg">
            <Send className="h-4 w-4" />
            {isPending
              ? "Sending..."
              : `Send Transfer to ${toSite?.name ?? "site"} - ${totalUnits} units`}
          </Button>
        </div>
      )}

      {/* ── Variant picker overlay ── */}
      <Modal open={!!activeProduct} onClose={() => setActiveVariant(null)}
        title={activeProduct?.name ?? ""} description="Select a variant" size="sm">
        {activeProduct && (
          <div className="p-2 max-h-72 overflow-y-auto -mx-2">
            {activeProduct.variants.map((v) => (
              <button
                key={v.id}
                onMouseDown={() => addToCart(activeProduct, v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted text-left transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{v.name}</p>
                  {v.sku && <p className="text-xs text-muted-foreground">SKU: {v.sku}</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className={v.stock === 0 ? "text-danger" : "text-success"}>Stock: {v.stock}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
