// src/lib/format.ts
// All display formatting in one place.
// Components import from here — never format inline.

/* ── Currency ───────────────────────────────────────────────── */

/**
 * Format a monetary amount with the site's currency symbol.
 * Handles positive, negative, and zero values consistently.
 *
 * formatCurrency(1180, "₹")   → "₹1,180.00"
 * formatCurrency(-100, "₹")   → "-₹100.00"
 * formatCurrency(0, "$")      → "$0.00"
 */
export function formatCurrency(
  amount: number,
  symbol: string = "₹",
  decimals: number = 2
): string {
  const abs       = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = amount < 0 ? "-" : "";
  return `${sign}${symbol}${formatted}`;
}

/**
 * Format a discount line — always shows as negative.
 * formatDiscount(100, "₹") → "-₹100.00"
 */
export function formatDiscount(amount: number, symbol: string = "₹"): string {
  return formatCurrency(-Math.abs(amount), symbol);
}

/* ── Date / Time ────────────────────────────────────────────── */

type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY/MM/DD" | "YYYY-MM-DD";

/**
 * Format a date according to the site's date format preference.
 *
 * formatDate(new Date(), "DD/MM/YYYY") → "27/02/2026"
 * formatDate(new Date(), "MM/DD/YYYY") → "02/27/2026"
 */
export function formatDate(
  date: Date | string,
  format: DateFormat = "DD/MM/YYYY"
): string {
  const d   = typeof date === "string" ? new Date(date) : date;
  const dd  = String(d.getDate()).padStart(2, "0");
  const mm  = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());

  switch (format) {
    case "DD/MM/YYYY": return `${dd}/${mm}/${yyyy}`;
    case "MM/DD/YYYY": return `${mm}/${dd}/${yyyy}`;
    case "YYYY/MM/DD": return `${yyyy}/${mm}/${dd}`;
    case "YYYY-MM-DD": return `${yyyy}-${mm}-${dd}`;
    default:           return `${dd}/${mm}/${yyyy}`;
  }
}

/**
 * Format a date + time in the site's timezone.
 * Used for receipt timestamps, report dates, coupon expiry.
 *
 * formatDateTime(new Date(), "Asia/Kolkata", "DD/MM/YYYY")
 * → "27/02/2026, 14:32"
 */
export function formatDateTime(
  date: Date | string,
  timezone: string = "UTC",
  dateFormat: DateFormat = "DD/MM/YYYY"
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  // Get date parts in the target timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

  const dd   = get("day");
  const mm   = get("month");
  const yyyy = get("year");
  const hh   = get("hour");
  const min  = get("minute");

  let datePart: string;
  switch (dateFormat) {
    case "DD/MM/YYYY": datePart = `${dd}/${mm}/${yyyy}`; break;
    case "MM/DD/YYYY": datePart = `${mm}/${dd}/${yyyy}`; break;
    case "YYYY/MM/DD": datePart = `${yyyy}/${mm}/${dd}`; break;
    case "YYYY-MM-DD": datePart = `${yyyy}-${mm}-${dd}`; break;
    default:           datePart = `${dd}/${mm}/${yyyy}`;
  }

  return `${datePart}, ${hh}:${min}`;
}

/**
 * Format just the time in a timezone.
 * formatTime(new Date(), "Asia/Kolkata") → "14:32"
 */
export function formatTime(
  date: Date | string,
  timezone: string = "UTC"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   false,
  }).format(d);
}

/* ── Phone ──────────────────────────────────────────────────── */

/**
 * Format a phone number with country code.
 * formatPhone("9876543210", "+91") → "+91 9876543210"
 */
export function formatPhone(number: string, phoneCode: string = ""): string {
  if (!number) return "";
  const clean = number.replace(/\D/g, "");
  return phoneCode ? `${phoneCode} ${clean}` : clean;
}

/* ── Site locale context ────────────────────────────────────── */

/**
 * Minimal site locale — pass this around instead of individual fields.
 * Avoids prop drilling of 4 separate fields everywhere.
 */
export interface SiteLocale {
  currencySymbol: string;   // "₹"
  currencyCode:   string;   // "INR"
  timezone:       string;   // "Asia/Kolkata"
  dateFormat:     DateFormat;
  phoneCode:      string;   // "+91"
}

export const DEFAULT_LOCALE: SiteLocale = {
  currencySymbol: "₹",
  currencyCode:   "INR",
  timezone:       "Asia/Kolkata",
  dateFormat:     "DD/MM/YYYY",
  phoneCode:      "+91",
};