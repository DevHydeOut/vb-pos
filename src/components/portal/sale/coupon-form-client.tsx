"use client";

import { useState, useTransition } from "react";
import { useRouter }  from "next/navigation";
import { toast }      from "sonner";
import {
  createCouponAction,
  updateCouponAction,
  softDeleteCouponAction,
} from "@/actions/portal/coupon-tax";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Trash2, BadgePercent, BadgeDollarSign,
  Info, Ticket, ToggleLeft, ToggleRight,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

type DiscountType = "PERCENTAGE" | "FIXED";
type ApplyOn      = "SUBTOTAL_TAX_RECALC" | "SUBTOTAL_TAX_FIXED" | "TOTAL";

interface Coupon {
  id:            string;
  code:          string;
  description:   string | null;
  discountType:  DiscountType;
  discountValue: number;
  capAmount:     number | null;
  applyOn:       ApplyOn;
  minOrderValue: number | null;
  expiresAt:     Date | null;
  isActive:      boolean;
}

/* ── Apply-on option cards ──────────────────────────────────── */

const APPLY_ON_OPTIONS: { value: ApplyOn; label: string; desc: string; example: string }[] = [
  {
    value:   "SUBTOTAL_TAX_RECALC",
    label:   "Subtotal · tax recalculates",
    desc:    "Discount on item price. Tax is recalculated on the discounted subtotal.",
    example: "₹1000 item − ₹100 = ₹900 subtotal · Tax on ₹900",
  },
  {
    value:   "SUBTOTAL_TAX_FIXED",
    label:   "Subtotal · tax fixed",
    desc:    "Discount on item price. Tax stays on the original amount.",
    example: "₹1000 item − ₹100 = ₹900 subtotal · Tax still on ₹1000",
  },
  {
    value:   "TOTAL",
    label:   "Total (incl. tax)",
    desc:    "Discount on the full bill including tax.",
    example: "₹1180 total − ₹100 = ₹1080",
  },
];

/* ── Component ──────────────────────────────────────────────── */

export function CouponFormClient({
  siteId,
  coupon,
}: {
  siteId: string | null;
  coupon: Coupon | null;
}) {
  const router                         = useRouter();
  const isEdit                         = !!coupon;
  const [isPending, startTransition]   = useTransition();
  const [deleteOpen, setDeleteOpen]    = useState(false);

  // Form state
  const [code,          setCode]         = useState(coupon?.code          ?? "");
  const [description,   setDescription]  = useState(coupon?.description   ?? "");
  const [discountType,  setDiscountType] = useState<DiscountType>(coupon?.discountType ?? "PERCENTAGE");
  const [discountValue, setDiscountValue]= useState(String(coupon?.discountValue ?? ""));
  const [capAmount,     setCapAmount]    = useState(coupon?.capAmount ? String(coupon.capAmount) : "");
  const [applyOn,       setApplyOn]      = useState<ApplyOn>(coupon?.applyOn ?? "SUBTOTAL_TAX_RECALC");
  const [minOrder,      setMinOrder]     = useState(coupon?.minOrderValue ? String(coupon.minOrderValue) : "");
  const [expiresAt,     setExpiresAt]    = useState(
    coupon?.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : ""
  );
  const [isActive,      setIsActive]     = useState(coupon?.isActive ?? true);

  // Live discount preview
  const exampleSubtotal = 1000;
  const exampleTax      = 180;
  const exampleTotal    = exampleSubtotal + exampleTax;

  function calcPreview() {
    const val = parseFloat(discountValue);
    const cap = parseFloat(capAmount);
    if (!val || val <= 0) return null;

    let raw = discountType === "PERCENTAGE" ? (exampleSubtotal * val) / 100 : val;
    if (!isNaN(cap) && cap > 0) raw = Math.min(raw, cap);

    if (applyOn === "SUBTOTAL_TAX_RECALC") {
      const disc       = Math.min(raw, exampleSubtotal);
      const newSub     = exampleSubtotal - disc;
      const newTax     = Math.round(newSub * (exampleTax / exampleSubtotal) * 100) / 100;
      return { disc, newSub, newTax, newTotal: newSub + newTax };
    }
    if (applyOn === "SUBTOTAL_TAX_FIXED") {
      const disc   = Math.min(raw, exampleSubtotal);
      const newSub = exampleSubtotal - disc;
      return { disc, newSub, newTax: exampleTax, newTotal: newSub + exampleTax };
    }
    // TOTAL
    const disc = Math.min(raw, exampleTotal);
    return { disc, newSub: exampleSubtotal, newTax: exampleTax, newTotal: exampleTotal - disc };
  }

  const preview = calcPreview();

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("code",          code);
      fd.append("description",   description);
      fd.append("discountType",  discountType);
      fd.append("discountValue", discountValue);
      fd.append("capAmount",     capAmount);
      fd.append("applyOn",       applyOn);
      fd.append("minOrderValue", minOrder);
      fd.append("expiresAt",     expiresAt);
      fd.append("isActive",      String(isActive));

      const res = isEdit
        ? await updateCouponAction(coupon!.id, siteId, fd)
        : await createCouponAction(siteId, fd);

      if (res.success) {
        toast.success(isEdit ? "Coupon updated." : "Coupon created.");
        router.push(siteId ? `/portal/${siteId}/sale/coupons` : `/dashboard/manage/coupons`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await softDeleteCouponAction(coupon!.id, siteId);
      if (res.success) {
        toast.success("Coupon deleted.");
        router.push(siteId ? `/portal/${siteId}/sale/coupons` : `/dashboard/manage/coupons`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 px-6 py-10">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center shrink-0">
            <Ticket className="h-6 w-6 text-background" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEdit ? "Edit Coupon" : "New Coupon"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit ? `Editing ${coupon!.code}` : "Create a new discount coupon"}
            </p>
          </div>
        </div>

        {/* Active toggle */}
        <button onClick={() => setIsActive((p) => !p)}
          className="flex items-center gap-2 text-sm font-medium transition-colors mt-1">
          {isActive
            ? <ToggleRight className="h-6 w-6 text-foreground" />
            : <ToggleLeft  className="h-6 w-6 text-muted-foreground" />}
          <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </button>
      </div>

      <div className="border-t border-border" />

      {/* ── Basic info ──────────────────────────────────────── */}
      <div className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Basic Info
        </h2>

        <div className="space-y-2">
          <Label>Coupon Code <span className="text-destructive">*</span></Label>
          <Input
            value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. SAVE10"
            className="font-mono tracking-widest uppercase h-11"
          />
          <p className="text-xs text-muted-foreground">Cashier enters this at checkout.</p>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 10% off for new customers" className="h-11" />
        </div>
      </div>

      <div className="border-t border-border" />

      {/* ── Discount amount ─────────────────────────────────── */}
      <div className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Discount
        </h2>

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: "PERCENTAGE", label: "Percentage", icon: BadgePercent },
            { value: "FIXED",      label: "Fixed Amount", icon: BadgeDollarSign },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => { setDiscountType(value); setCapAmount(""); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                discountType === value
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/30"
              }`}>
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              {discountType === "PERCENTAGE" ? "Percentage (%)" : "Fixed Amount (₹)"}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input type="number" min="0" step="0.01"
              value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 100"}
              className="h-11" />
          </div>

          {/* Cap — only for percentage */}
          {discountType === "PERCENTAGE" && (
            <div className="space-y-2">
              <Label>Max Discount Cap (₹)
                <span className="text-muted-foreground text-xs font-normal ml-1">optional</span>
              </Label>
              <Input type="number" min="0" step="0.01"
                value={capAmount} onChange={(e) => setCapAmount(e.target.value)}
                placeholder="e.g. 200" className="h-11" />
              <p className="text-xs text-muted-foreground">
                e.g. 10% off but max ₹200 discount
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* ── Apply on ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Apply Discount On
        </h2>
        <div className="space-y-2">
          {APPLY_ON_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setApplyOn(opt.value)}
              className={`w-full flex items-start gap-4 px-4 py-4 rounded-xl border text-left transition-all ${
                applyOn === opt.value
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/30"
              }`}>
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                applyOn === opt.value ? "border-foreground" : "border-muted-foreground/40"
              }`}>
                {applyOn === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-foreground" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
                <p className="text-xs text-muted-foreground/60 mt-1 font-mono">{opt.example}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* ── Conditions ──────────────────────────────────────── */}
      <div className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Conditions
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Minimum Order Value (₹)
              <span className="text-muted-foreground text-xs font-normal ml-1">optional</span>
            </Label>
            <Input type="number" min="0" step="0.01"
              value={minOrder} onChange={(e) => setMinOrder(e.target.value)}
              placeholder="e.g. 500" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Expiry Date
              <span className="text-muted-foreground text-xs font-normal ml-1">optional</span>
            </Label>
            <Input type="date" value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)} className="h-11" />
          </div>
        </div>
      </div>

      {/* ── Live preview ────────────────────────────────────── */}
      {preview && (
        <>
          <div className="border-t border-border" />
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> Live Preview
            </h2>
            <div className="bg-muted/50 border border-border rounded-xl p-4 font-mono text-sm space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Item subtotal</span><span>₹{exampleSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (18%)</span><span>₹{exampleTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-destructive font-semibold">
                <span>Discount ({code || "CODE"})</span>
                <span>− ₹{preview.disc.toFixed(2)}</span>
              </div>
              {applyOn === "SUBTOTAL_TAX_RECALC" && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Tax after discount</span><span>₹{preview.newTax.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground">
                <span>Total</span><span>₹{preview.newTotal.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on example: ₹1000 subtotal + ₹180 tax
            </p>
          </div>
        </>
      )}

      <div className="border-t border-border" />

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isEdit ? "Save Changes" : "Create Coupon"}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        {isEdit && (
          <Button variant="outline" onClick={() => setDeleteOpen(true)} disabled={isPending}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              Coupon <span className="font-mono font-bold">{coupon?.code}</span> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}