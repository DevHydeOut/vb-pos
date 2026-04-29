// src/config/manage-resources.ts
// ─────────────────────────────────────────────────────────────
// Single config that drives the sidebar Manage section AND
// the dashboard home page quick-access cards.
//
// To add a new resource in future:
//   1. Add one object to MANAGE_RESOURCES
//   2. Create the page at /dashboard/manage/[key]/page.tsx
//   3. That's it — sidebar and home page update automatically.
// ─────────────────────────────────────────────────────────────

import { Package, Star, Boxes } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ManageResource {
  key:         string;       // unique identifier + URL segment
  label:       string;       // display name
  description: string;       // shown on home page card
  icon:        LucideIcon;
  path:        string;       // full path
  available:   boolean;      // false = shows "coming soon" badge
}

export const MANAGE_RESOURCES: ManageResource[] = [
  {
    key:         "products",
    label:       "Stock Items",
    description: "Create products, prices, tax groups, and stock-ready catalogue items.",
    icon:        Package,
    path:        "/dashboard/manage/products",
    available:   true,
  },
  {
    key:         "stock",
    label:       "Stock Management",
    description: "Use each site portal to count stock, adjust stock, and share stock between sites.",
    icon:        Boxes,
    path:        "/dashboard/sites",
    available:   true,
  },
  {
    key:         "loyalty",
    label:       "Royalty Points",
    description: "Configure earning rules and rewards customers can claim at any site.",
    icon:        Star,
    path:        "/dashboard/manage/loyalty",
    available:   true,
  },
];
