/**
 * src/lib/design-tokens.ts
 *
 * JavaScript mirror of the CSS design tokens in globals.css.
 * Use this when you need token values in TSX/JS code — e.g. for:
 *   • Recharts / chart colors
 *   • Dynamic inline styles
 *   • Canvas drawing
 *   • Animation libraries (Framer Motion values)
 *   • Unit tests that check dimensions
 *
 * Keep this in sync with globals.css @theme section.
 * When you change a value in globals.css, update it here too.
 */

// ─── Layout ───────────────────────────────────────────────────────────────────
export const layout = {
  /** Portal top navigation bar height in px */
  headerHeight: 64,
  /** Mobile bottom navigation height in px */
  bottomNavHeight: 64,
  /** Dashboard left sidebar width in px */
  sidebarWidth: 256,
  /** Collapsed (icon-only) sidebar width in px */
  sidebarCollapsedWidth: 64,
  /** POS / Stock Entry cart panel width in px */
  cartPanelWidth: 340,
  /** Cart panel width at xl breakpoint in px */
  cartPanelWidthXl: 380,
} as const;

// ─── Breakpoints ──────────────────────────────────────────────────────────────
export const breakpoints = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  "2xl": 1536,
} as const;

// ─── Border radius (in rem, as strings for style props) ───────────────────────
export const radius = {
  xs:   "0.25rem",    /*  4px */
  sm:   "0.375rem",   /*  6px */
  md:   "0.5rem",     /*  8px */
  lg:   "0.75rem",    /* 12px */
  xl:   "1rem",       /* 16px */
  "2xl":"1.25rem",    /* 20px */
  "3xl":"1.5rem",     /* 24px */
  full: "9999px",
} as const;

// ─── Animation durations (in ms, for use with JS animation libraries) ─────────
export const duration = {
  instant: 50,
  fast:    100,
  normal:  150,
  slow:    250,
  slower:  350,
} as const;

// ─── Status colors — use for charts, canvas, dynamic styles ───────────────────
// These match the oklch values in globals.css converted to hex for JS compat.
// Light mode values. For dark mode, read CSS variables at runtime (see below).
export const statusColors = {
  success: {
    base:  "#22c55e",  /* oklch(0.65 0.18 145) */
    muted: "#f0fdf4",  /* oklch(0.97 0.03 145) */
    text:  "#16a34a",  /* oklch(0.40 0.12 145) */
  },
  warning: {
    base:  "#f59e0b",  /* oklch(0.72 0.17 65)  */
    muted: "#fffbeb",  /* oklch(0.97 0.03 80)  */
    text:  "#d97706",  /* oklch(0.45 0.14 65)  */
  },
  danger: {
    base:  "#ef4444",  /* oklch(0.577 0.245 27) */
    muted: "#fef2f2",  /* oklch(0.97 0.02 27)   */
    text:  "#dc2626",  /* oklch(0.45 0.18 27)   */
  },
  info: {
    base:  "#3b82f6",  /* oklch(0.62 0.17 245) */
    muted: "#eff6ff",  /* oklch(0.97 0.02 245) */
    text:  "#2563eb",  /* oklch(0.40 0.13 245) */
  },
} as const;

// ─── Chart color palette ───────────────────────────────────────────────────────
// Ordered set for multi-series charts (bar, line, pie).
// These work in both light and dark mode.
export const chartColors = [
  "#3b82f6",  /* blue    */
  "#22c55e",  /* green   */
  "#f59e0b",  /* amber   */
  "#ef4444",  /* red     */
  "#8b5cf6",  /* violet  */
  "#06b6d4",  /* cyan    */
  "#f97316",  /* orange  */
  "#ec4899",  /* pink    */
] as const;

// ─── Runtime CSS variable reader ──────────────────────────────────────────────
// Use this when you need the current theme value at runtime (respects dark mode).
// Example: getCSSVar("--color-success") → "oklch(0.65 0.18 145)"
export function getCSSVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// ─── Type exports ──────────────────────────────────────────────────────────────
export type StatusColor = keyof typeof statusColors;
export type ChartColor  = typeof chartColors[number];