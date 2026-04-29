// src/lib/discount.ts
// Pure utility — no "use server", safe to import in client and server code

type DiscountType = "PERCENTAGE" | "FIXED";
type ApplyOn      = "SUBTOTAL_TAX_RECALC" | "SUBTOTAL_TAX_FIXED" | "TOTAL";

interface CouponInput {
  discountType:  DiscountType;
  discountValue: number;
  capAmount:     number | null;
  applyOn:       ApplyOn;
}

interface DiscountResult {
  discountAmount: number;
  newSubtotal:    number;
  newTaxAmount:   number;
  newTotal:       number;
}

export function calculateDiscount({
  subtotal,
  taxAmount,
  coupon,
}: {
  subtotal:  number;
  taxAmount: number;
  coupon:    CouponInput;
}): DiscountResult {
  const total = subtotal + taxAmount;

  // Raw discount before cap
  let raw = coupon.discountType === "PERCENTAGE"
    ? (subtotal * coupon.discountValue) / 100
    : coupon.discountValue;

  // Cap only applies to PERCENTAGE discounts
  if (coupon.discountType === "PERCENTAGE" && coupon.capAmount && coupon.capAmount > 0) {
    raw = Math.min(raw, coupon.capAmount);
  }

  const round = (n: number) => Math.round(n * 100) / 100;

  if (coupon.applyOn === "SUBTOTAL_TAX_RECALC") {
    // Discount off item price — tax recalculates on new subtotal
    const discountAmount = Math.min(raw, subtotal);
    const newSubtotal    = subtotal - discountAmount;
    const taxRate        = subtotal > 0 ? taxAmount / subtotal : 0;
    const newTaxAmount   = round(newSubtotal * taxRate);
    return {
      discountAmount: round(discountAmount),
      newSubtotal:    round(newSubtotal),
      newTaxAmount,
      newTotal:       round(newSubtotal + newTaxAmount),
    };
  }

  if (coupon.applyOn === "SUBTOTAL_TAX_FIXED") {
    // Discount off item price — tax stays on original amount
    const discountAmount = Math.min(raw, subtotal);
    const newSubtotal    = subtotal - discountAmount;
    return {
      discountAmount: round(discountAmount),
      newSubtotal:    round(newSubtotal),
      newTaxAmount:   round(taxAmount),   // unchanged
      newTotal:       round(newSubtotal + taxAmount),
    };
  }

  // TOTAL — discount off the full bill including tax
  const discountAmount = Math.min(raw, total);
  return {
    discountAmount: round(discountAmount),
    newSubtotal:    round(subtotal),      // unchanged
    newTaxAmount:   round(taxAmount),     // unchanged
    newTotal:       round(total - discountAmount),
  };
}