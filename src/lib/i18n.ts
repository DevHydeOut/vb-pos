// src/lib/i18n.ts
// Minimal i18n foundation.
// Currently English only. To add a new language:
//   1. Create src/lib/locales/hi.ts (copy en.ts, translate values)
//   2. Add it to the LOCALES map below
//   3. Pass language from site/user context — nothing else changes.

/* ── String definitions ─────────────────────────────────────── */
// All customer-facing and receipt strings live here.
// Internal UI strings (buttons, labels) stay hardcoded in English
// since those are admin-facing and not worth translating yet.

const en = {
  // Receipts
  "receipt.title":         "Receipt",
  "receipt.date":          "Date",
  "receipt.time":          "Time",
  "receipt.subtotal":      "Subtotal",
  "receipt.tax":           "Tax",
  "receipt.discount":      "Discount",
  "receipt.total":         "Total",
  "receipt.thankyou":      "Thank you for your visit!",
  "receipt.poweredBy":     "Powered by POSS",

  // Coupon
  "coupon.applied":        "Coupon applied",
  "coupon.invalid":        "Invalid coupon code",
  "coupon.expired":        "This coupon has expired",
  "coupon.minOrder":       "Minimum order value not met",

  // General
  "general.noData":        "No data available",
  "general.loading":       "Loading...",
} as const;

export type TranslationKey = keyof typeof en;

/* ── Locale map — add new languages here ────────────────────── */
const LOCALES: Record<string, typeof en> = {
  en,
  // hi: hiStrings,   ← uncomment when adding Hindi
  // ar: arStrings,   ← uncomment when adding Arabic
};

/* ── t() function ───────────────────────────────────────────── */

/**
 * Translate a key to the given language.
 * Falls back to English if key or language not found.
 *
 * t("receipt.total")        → "Total"
 * t("receipt.total", "hi")  → "कुल" (when Hindi added)
 */
export function t(key: TranslationKey, language: string = "en"): string {
  const locale = LOCALES[language] ?? LOCALES["en"];
  return locale[key] ?? en[key] ?? key;
}