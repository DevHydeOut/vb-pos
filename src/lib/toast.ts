// src/lib/toast.ts
//
// Typed toast helpers wrapping Sonner.
// Use these instead of calling toast() directly — consistent messages,
// no need to remember Sonner's API, and easy to swap library later.
//
// Usage:
//   import { showToast } from "@/lib/toast";
//
//   // Success
//   showToast.success("Product saved");
//   showToast.success("Stock updated", "24 units added to Warehouse");
//
//   // Error (from action result)
//   const result = await saveProductAction(fd);
//   if (!result.success) showToast.error(result.error);
//
//   // Common patterns (pre-built messages)
//   showToast.saved("Product");          → "Product saved"
//   showToast.deleted("Category");       → "Category deleted"
//   showToast.created("Transfer");       → "Transfer created"
//   showToast.updated("Stock level");    → "Stock level updated"
//
// Action result helper:
//   // Handles success/error automatically from ActionResult<T>
//   const result = await someAction(fd);
//   handleActionResult(result, "Product saved");

import { toast } from "sonner";

// ─── Core helpers ──────────────────────────────────────────────────────────────
export const showToast = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),

  error: (message: string, description?: string) =>
    toast.error(message, {
      description: description ?? "Please try again or contact support.",
    }),

  warning: (message: string, description?: string) =>
    toast.warning(message, { description }),

  info: (message: string, description?: string) =>
    toast.info(message, { description }),

  loading: (message: string) =>
    toast.loading(message),

  dismiss: (id?: string | number) =>
    toast.dismiss(id),

  // ── Common CRUD messages ─────────────────────────────────────────────────
  saved:    (entity: string) => toast.success(`${entity} saved`),
  created:  (entity: string) => toast.success(`${entity} created`),
  updated:  (entity: string) => toast.success(`${entity} updated`),
  deleted:  (entity: string) => toast.success(`${entity} deleted`),
  copied:   (what: string)   => toast.success(`${what} copied to clipboard`),

  // ── Domain-specific messages ─────────────────────────────────────────────
  stockIn:  (ref: string)    => toast.success("Stock received", { description: ref }),
  stockOut: (ref: string)    => toast.success("Stock recorded", { description: ref }),
  transferred: (from: string, to: string) =>
    toast.success("Transfer initiated", { description: `${from} → ${to}` }),
} as const;

// ─── Action result handler ────────────────────────────────────────────────────
// Use with server actions that return ActionResult<T>
// Example:
//   const result = await createProductAction(fd);
//   handleActionResult(result, "Product created");

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export function handleActionResult<T>(
  result: ActionResult<T>,
  successMessage: string,
  successDescription?: string,
): result is { success: true; data?: T } {
  if (result.success) {
    showToast.success(successMessage, successDescription);
    return true;
  } else {
    showToast.error(result.error);
    return false;
  }
}

// ─── ActionResult type ─────────────────────────────────────────────────────────
// Export this so all server actions return the same shape.
// Usage in action files:
//   import type { ActionResult } from "@/lib/toast";
//   export async function myAction(): Promise<ActionResult<Product>> { ... }

export type { ActionResult };