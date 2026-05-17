"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle, BadgePercent, Banknote, CheckCircle2, CreditCard, Minus, Package, Plus,
  Printer, Receipt, Search, ShoppingCart, Star, Trash2, UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { completePosSaleAction, type PaymentMethod } from "@/actions/portal/billing";
import { lookupCustomerByPhoneAction } from "@/actions/portal/loyalty";

type DiscountType = "NONE" | "FIXED" | "PERCENT";

interface Variant {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sellingPrice: number | null;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sellingPrice: number | null;
  stock: number;
  hasVariants: boolean;
  categoryName: string | null;
  taxRate: number;
  imageUrl: string | null;
  variants: Variant[];
}

interface CartLine {
  key: string;
  product: Product;
  variant: Variant | null;
  quantity: number;
  discountType: DiscountType;
  discountValue: number;
}

interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  type: string;
  discountValue: number | null;
  productId: string | null;
}

interface CustomerLookup {
  id: string;
  name: string;
  phone: string;
  currentPoints: number;
  lifetimePoints: number;
  availableRewards: Reward[];
}

interface ReceiptSnapshot {
  referenceNo: string;
  createdAt: Date;
  customerPhone: string;
  customerName: string;
  customerPoints: number | null;
  pointsEarned: number;
  rewardName: string | null;
  items: CartLine[];
  subtotal: number;
  itemDiscount: number;
  rewardDiscount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
}

interface Props {
  siteId: string;
  currencySymbol: string;
  loyaltyEnabled: boolean;
  pointsName: string;
  products: Product[];
}

function lineKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function allocateDiscount(total: number, weights: number[]) {
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  let remaining = total;

  return weights.map((weight, index) => {
    if (total <= 0 || weightTotal <= 0) return 0;
    if (index === weights.length - 1) return money(Math.min(weight, remaining));

    const share = money(total * (weight / weightTotal));
    const value = money(Math.min(weight, share, remaining));
    remaining = money(remaining - value);
    return value;
  });
}

function barcodeBars(value: string) {
  let seed = 0;
  for (const char of value) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;

  return Array.from({ length: 54 }, (_, index) => {
    seed = (seed * 1664525 + 1013904223 + index) >>> 0;
    return {
      width: 1 + (seed % 3),
      dark: index < 3 || index > 50 || seed % 5 !== 0,
    };
  });
}

function PrintableReceipt({
  receipt,
  currencySymbol,
  pointsName,
}: {
  receipt: ReceiptSnapshot;
  currencySymbol: string;
  pointsName: string;
}) {
  const bars = barcodeBars(receipt.referenceNo);

  return (
    <div className="receipt-print-area fixed -left-[10000px] top-0 w-[320px] bg-white p-4 text-black">
      <div className="text-center">
        <p className="text-base font-bold">POS Manager</p>
        <p className="text-xs">Sales Receipt</p>
      </div>

      <div className="my-3 flex h-12 items-stretch justify-center gap-px">
        {bars.map((bar, index) => (
          <div
            key={index}
            style={{ width: bar.width }}
            className={bar.dark ? "bg-black" : "bg-transparent"}
          />
        ))}
      </div>
      <p className="text-center text-xs font-mono">{receipt.referenceNo}</p>

      <div className="mt-3 space-y-1 border-y border-black/30 py-2 text-xs">
        <div className="flex justify-between gap-3">
          <span>Date</span>
          <span>{receipt.createdAt.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Phone</span>
          <span>{receipt.customerPhone}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Name</span>
          <span>{receipt.customerName || "Walk-in customer"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Payment</span>
          <span>{receipt.paymentMethod}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        {receipt.items.map((line) => {
          const unitPrice = line.variant?.sellingPrice ?? line.product.sellingPrice ?? 0;
          return (
            <div key={line.key}>
              <div className="flex justify-between gap-3">
                <span className="font-medium">{line.product.name}</span>
                <span>{currencySymbol}{money(unitPrice * line.quantity).toFixed(2)}</span>
              </div>
              <p className="text-[11px]">
                {line.quantity} x {currencySymbol}{unitPrice.toFixed(2)}
                {line.discountType !== "NONE" ? `, discount ${line.discountValue}${line.discountType === "PERCENT" ? "%" : ""}` : ""}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-1 border-t border-black/30 pt-2 text-xs">
        <div className="flex justify-between"><span>Subtotal</span><span>{currencySymbol}{receipt.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Item discount</span><span>-{currencySymbol}{receipt.itemDiscount.toFixed(2)}</span></div>
        {receipt.rewardDiscount > 0 && (
          <div className="flex justify-between"><span>Reward discount</span><span>-{currencySymbol}{receipt.rewardDiscount.toFixed(2)}</span></div>
        )}
        <div className="flex justify-between"><span>Tax</span><span>{currencySymbol}{receipt.tax.toFixed(2)}</span></div>
        <div className="flex justify-between border-t border-black/30 pt-1 text-sm font-bold">
          <span>Total</span><span>{currencySymbol}{receipt.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-3 text-center text-xs">
        <p>{receipt.pointsEarned} {pointsName.toLowerCase()} earned</p>
        {receipt.customerPoints !== null && <p>Previous balance: {receipt.customerPoints} {pointsName.toLowerCase()}</p>}
        {receipt.rewardName && <p>Reward claimed: {receipt.rewardName}</p>}
      </div>
    </div>
  );
}

export function PosBillingClient({
  siteId,
  currencySymbol,
  loyaltyEnabled,
  pointsName,
  products,
}: Props) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState<CustomerLookup | null>(null);
  const [rewardId, setRewardId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ReceiptSnapshot | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(q) ||
      product.sku?.toLowerCase().includes(q) ||
      product.barcode?.toLowerCase().includes(q) ||
      product.categoryName?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const selectedReward = useMemo(
    () => customer?.availableRewards.find((reward) => reward.id === rewardId) ?? null,
    [customer, rewardId]
  );

  const totals = useMemo(() => {
    const baseLines = cart.map((line) => {
        const unitPrice = line.variant?.sellingPrice ?? line.product.sellingPrice ?? 0;
        const rawDiscount = line.discountType === "PERCENT"
          ? unitPrice * Math.min(line.discountValue, 100) / 100
          : line.discountType === "FIXED"
            ? line.discountValue
            : 0;
        const unitDiscount = money(Math.min(unitPrice, rawDiscount));
        const taxableUnit = money(unitPrice - unitDiscount);
        const subtotal = money(unitPrice * line.quantity);
        const discount = money(unitDiscount * line.quantity);
        const taxableBeforeReward = money(taxableUnit * line.quantity);

        return { line, unitPrice, unitDiscount, subtotal, discount, taxableBeforeReward };
    });

    const subtotal = money(baseLines.reduce((sum, line) => sum + line.subtotal, 0));
    const discount = money(baseLines.reduce((sum, line) => sum + line.discount, 0));
    const taxableBeforeReward = money(baseLines.reduce((sum, line) => sum + line.taxableBeforeReward, 0));

    let rewardDiscount = 0;
    let rewardDiscounts = baseLines.map(() => 0);

    if (selectedReward) {
      if (selectedReward.type === "FIXED_DISCOUNT") {
        rewardDiscount = money(Math.min(taxableBeforeReward, selectedReward.discountValue ?? 0));
        rewardDiscounts = allocateDiscount(rewardDiscount, baseLines.map((line) => line.taxableBeforeReward));
      } else if (selectedReward.type === "PERCENT_DISCOUNT") {
        const percent = Math.min(Math.max(selectedReward.discountValue ?? 0, 0), 100);
        rewardDiscount = money(taxableBeforeReward * percent / 100);
        rewardDiscounts = allocateDiscount(rewardDiscount, baseLines.map((line) => line.taxableBeforeReward));
      } else if (selectedReward.type === "FREE_PRODUCT") {
        const lineIndex = baseLines.findIndex((line) => line.line.product.id === selectedReward.productId);
        if (lineIndex !== -1) {
          const line = baseLines[lineIndex];
          rewardDiscount = money(Math.min(line.unitPrice - line.unitDiscount, line.taxableBeforeReward));
          rewardDiscounts[lineIndex] = rewardDiscount;
        }
      }
    }

    const tax = money(baseLines.reduce((sum, line, index) => {
      const taxable = money(line.taxableBeforeReward - Math.min(line.taxableBeforeReward, rewardDiscounts[index] ?? 0));
      return sum + money(taxable * line.line.product.taxRate / 100);
    }, 0));
    const taxable = money(taxableBeforeReward - rewardDiscount);

    return {
      subtotal,
      discount,
      rewardDiscount,
      tax,
      total: money(taxable + tax),
      items: cart.reduce((sum, line) => sum + line.quantity, 0),
    };
  }, [cart, selectedReward]);

  function addProduct(product: Product, variant: Variant | null = null) {
    const key = lineKey(product.id, variant?.id);
    setMessage(null);
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      const stock = variant?.stock ?? product.stock;
      if (existing) {
        return current.map((line) =>
          line.key === key
            ? { ...line, quantity: Math.min(stock, line.quantity + 1) }
            : line
        );
      }
      return [
        ...current,
        { key, product, variant, quantity: 1, discountType: "NONE", discountValue: 0 },
      ];
    });
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  }

  function removeLine(key: string) {
    setCart((current) => current.filter((line) => line.key !== key));
  }

  function lookupCustomer() {
    setMessage(null);
    setCustomer(null);
    setRewardId("");
    startTransition(async () => {
      const result = await lookupCustomerByPhoneAction(phone, siteId);
      if (result.success) {
        setCustomer(result.customer);
        setName((current) => current || result.customer.name);
      } else {
        setMessage({ type: "error", text: "No existing customer found. A new customer will be created when billed." });
      }
    });
  }

  function completeSale(method: PaymentMethod) {
    setMessage(null);
    setLastReceipt(null);
    if (!phone.trim()) {
      setMessage({ type: "error", text: "Customer phone number is required." });
      return;
    }
    if (cart.length === 0) {
      setMessage({ type: "error", text: "Add at least one item to the bill." });
      return;
    }

    const receiptItems = cart.map((line) => ({ ...line }));
    const receiptPhone = phone.trim();
    const receiptName = name.trim();
    const receiptCustomerPoints = customer?.currentPoints ?? null;
    const receiptRewardName = selectedReward?.name ?? null;
    const receiptTotals = { ...totals };
    const receiptPaymentMethod = method;

    startTransition(async () => {
      const result = await completePosSaleAction({
        siteId,
        customerPhone: receiptPhone,
        customerName: receiptName,
        rewardId,
        paymentMethod: receiptPaymentMethod,
        items: receiptItems.map((line) => ({
          productId: line.product.id,
          variantId: line.variant?.id ?? null,
          quantity: line.quantity,
          discountType: line.discountType,
          discountValue: line.discountValue,
        })),
      });

      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({
        type: "success",
        text: `${result.referenceNo} saved. ${result.pointsEarned} ${pointsName.toLowerCase()} earned.`,
      });
      setLastReceipt({
        referenceNo: result.referenceNo,
        createdAt: new Date(),
        customerPhone: receiptPhone,
        customerName: receiptName,
        customerPoints: receiptCustomerPoints,
        pointsEarned: result.pointsEarned,
        rewardName: receiptRewardName,
        items: receiptItems,
        subtotal: result.subtotal ?? receiptTotals.subtotal,
        itemDiscount: result.discountTotal ?? receiptTotals.discount,
        rewardDiscount: result.rewardDiscountTotal ?? receiptTotals.rewardDiscount,
        tax: result.taxTotal ?? receiptTotals.tax,
        total: result.grandTotal ?? receiptTotals.total,
        paymentMethod: result.paymentMethod ?? receiptPaymentMethod,
      });
      setCart([]);
      setRewardId("");
      setCustomer(null);
      setPhone("");
      setName("");
    });
  }

  function printLastReceipt() {
    if (!lastReceipt) return;
    window.print();
  }

  return (
    <main className="h-full min-h-0 overflow-hidden bg-background">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_440px]">
        <section className="flex min-w-0 flex-col border-r border-border">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products, SKU or barcode"
                  className="h-full flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground">
                {filteredProducts.length} items
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {filteredProducts.map((product) => {
                const hasVariants = product.hasVariants && product.variants.length > 0;
                const totalStock = hasVariants
                  ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
                  : product.stock;
                const price = product.sellingPrice ?? product.variants[0]?.sellingPrice ?? 0;
                const cartQty = cart
                  .filter((line) => line.product.id === product.id)
                  .reduce((sum, line) => sum + line.quantity, 0);

                return (
                  <div key={product.id} className="group relative cursor-pointer select-none overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-foreground/20 hover:shadow-md">
                    {cartQty > 0 && (
                      <div className="absolute right-2 top-2 z-10 flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-foreground px-1 text-xs font-bold text-background shadow-sm">
                        {cartQty}
                      </div>
                    )}
                    <button
                      onClick={() => !hasVariants && totalStock > 0 && addProduct(product)}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground/25" />
                          </div>
                        )}
                        {totalStock <= 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-bold text-muted-foreground">
                              Out of stock
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-semibold leading-tight">{product.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {product.sku ?? product.barcode ?? product.categoryName ?? "Product"}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">{currencySymbol}{price.toFixed(2)}</span>
                          <span className={`text-xs font-semibold tabular-nums ${totalStock <= 0 ? "text-destructive" : totalStock < 5 ? "text-warning" : "text-success"}`}>
                            {totalStock}
                          </span>
                        </div>
                      </div>
                    </button>
                    {hasVariants && (
                      <div className="mt-2 grid gap-1.5">
                        {product.variants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => variant.stock > 0 && addProduct(product, variant)}
                            disabled={variant.stock <= 0}
                            className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-45"
                          >
                            <span className="truncate">{variant.name}</span>
                            <span>{variant.stock}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col bg-background">
          <div className="shrink-0 border-b border-border p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Customer phone"
                className="h-9 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button variant="outline" onClick={lookupCustomer} disabled={isPending || !phone.trim()}>
                <UserRound className="h-4 w-4" />
              </Button>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name (optional)"
                className="h-9 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {loyaltyEnabled && (
              <div className="mt-3 rounded-xl border border-border bg-muted/30 p-2.5 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Star className="h-4 w-4 text-warning" />
                  Royalty Points
                </div>
                {customer ? (
                  <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                    <p>{customer.currentPoints.toLocaleString()} {pointsName} available at any site</p>
                    <select
                      value={rewardId}
                      onChange={(event) => setRewardId(event.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
                    >
                      <option value="">No reward claimed</option>
                      {customer.availableRewards.map((reward) => (
                        <option key={reward.id} value={reward.id}>
                          {reward.name} ({reward.pointsCost} {pointsName})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Enter a phone number to check existing customer points.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                <ShoppingCart className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">Add products to start billing</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cart.map((line) => {
                  const unitPrice = line.variant?.sellingPrice ?? line.product.sellingPrice ?? 0;
                  const stock = line.variant?.stock ?? line.product.stock;
                  return (
                    <div key={line.key} className="space-y-2.5 p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold">{line.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.variant?.name ?? line.product.categoryName ?? "Item"} - {currencySymbol}{unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeLine(line.key)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateLine(line.key, { quantity: Math.max(1, line.quantity - 1) })}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={stock}
                          value={line.quantity}
                          onChange={(event) => updateLine(line.key, {
                            quantity: Math.min(stock, Math.max(1, Number(event.target.value) || 1)),
                          })}
                          className="h-8 w-14 rounded-lg border border-border bg-background text-center text-sm font-bold"
                        />
                        <button
                          onClick={() => updateLine(line.key, { quantity: Math.min(stock, line.quantity + 1) })}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <span className="ml-auto text-xs text-muted-foreground">{stock} available</span>
                      </div>

                      <div className="grid grid-cols-[112px_1fr] gap-2">
                        <select
                          value={line.discountType}
                          onChange={(event) => updateLine(line.key, {
                            discountType: event.target.value as DiscountType,
                            discountValue: event.target.value === "NONE" ? 0 : line.discountValue,
                          })}
                          className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                        >
                          <option value="NONE">No discount</option>
                          <option value="FIXED">Price off</option>
                          <option value="PERCENT">Percent off</option>
                        </select>
                        <div className="flex h-8 items-center gap-2 rounded-lg border border-border px-2">
                          <BadgePercent className="h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="number"
                            min={0}
                            value={line.discountValue}
                            disabled={line.discountType === "NONE"}
                            onChange={(event) => updateLine(line.key, { discountValue: Number(event.target.value) || 0 })}
                            className="min-w-0 flex-1 bg-transparent text-xs outline-none disabled:opacity-40"
                            placeholder={line.discountType === "PERCENT" ? "Percent" : "Amount"}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border p-3">
            {message && (
              <div className={`mb-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                message.type === "success" ? "bg-success-muted text-success" : "bg-destructive/10 text-destructive"
              }`}>
                {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
                <div className="min-w-0 flex-1">
                  <span>{message.text}</span>
                  {message.type === "success" && lastReceipt && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 h-8 w-full bg-background"
                      onClick={printLastReceipt}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Receipt
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{currencySymbol}{money(totals.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Item discounts</span>
                <span>-{currencySymbol}{money(totals.discount).toFixed(2)}</span>
              </div>
              {totals.rewardDiscount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Reward discount</span>
                  <span>-{currencySymbol}{money(totals.rewardDiscount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{currencySymbol}{money(totals.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span>{currencySymbol}{money(totals.total).toFixed(2)}</span>
              </div>
            </div>
            <Button className="mt-3 h-11 w-full" onClick={() => { setLastReceipt(null); setPaymentOpen(true); }} disabled={isPending || cart.length === 0}>
              {isPending ? "Saving Bill..." : `Complete Payment (${totals.items})`}
            </Button>
          </div>
        </aside>
      </div>
      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]" onClick={() => !isPending && setPaymentOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            {lastReceipt ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-success-muted text-success">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Payment Complete</h2>
                  <p className="text-sm text-muted-foreground">{lastReceipt.referenceNo} saved successfully.</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex justify-between"><span>Total</span><span className="font-bold">{currencySymbol}{lastReceipt.total.toFixed(2)}</span></div>
                  <div className="mt-1 flex justify-between text-muted-foreground"><span>Method</span><span>{lastReceipt.paymentMethod}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setPaymentOpen(false)}>New Bill</Button>
                  <Button onClick={printLastReceipt}><Printer className="h-4 w-4" /> Print Receipt</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Complete Payment</h2>
                  <p className="text-sm text-muted-foreground">Select how the customer paid.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "CASH" as const, label: "Cash", icon: Banknote },
                    { value: "CARD" as const, label: "Card", icon: CreditCard },
                    { value: "ONLINE" as const, label: "Online", icon: Receipt },
                  ]).map((method) => {
                    const Icon = method.icon;
                    const active = paymentMethod === method.value;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`flex h-20 flex-col items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                          active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{currencySymbol}{totals.subtotal.toFixed(2)}</span></div>
                  <div className="mt-1 flex justify-between text-muted-foreground"><span>Tax</span><span>{currencySymbol}{totals.tax.toFixed(2)}</span></div>
                  <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span>{currencySymbol}{totals.total.toFixed(2)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={isPending}>Cancel</Button>
                  <Button onClick={() => completeSale(paymentMethod)} disabled={isPending}>
                    {isPending ? "Saving..." : "Finish Payment"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {lastReceipt && (
        <PrintableReceipt receipt={lastReceipt} currencySymbol={currencySymbol} pointsName={pointsName} />
      )}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print-area,
          .receipt-print-area * {
            visibility: visible;
          }
          .receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            min-height: auto !important;
            box-shadow: none !important;
          }
          @page {
            margin: 6mm;
            size: 80mm auto;
          }
        }
      `}</style>
    </main>
  );
}
