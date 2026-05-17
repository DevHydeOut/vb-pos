import { BarChart3, Boxes, Package, Star, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ManageResource {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
  available: boolean;
}

export const MANAGE_RESOURCES: ManageResource[] = [
  {
    key: "products",
    label: "Stock Items",
    description: "Create products, prices, tax groups, and stock-ready catalogue items.",
    icon: Package,
    path: "/dashboard/manage/products",
    available: true,
  },
  {
    key: "stock",
    label: "Stock Management",
    description: "Use each site portal to count stock, adjust stock, and share stock between sites.",
    icon: Boxes,
    path: "/dashboard/manage/stock",
    available: true,
  },
  {
    key: "reports",
    label: "Sales Reports",
    description: "Review monthly sales by site and download billing reports.",
    icon: BarChart3,
    path: "/dashboard/manage/reports",
    available: true,
  },
  {
    key: "product-import",
    label: "Product Import",
    description: "Upload a CSV product list and create or update stock items in bulk.",
    icon: Upload,
    path: "/dashboard/manage/products/import",
    available: true,
  },
  {
    key: "loyalty",
    label: "Royalty Points",
    description: "Configure earning rules and rewards customers can claim at any site.",
    icon: Star,
    path: "/dashboard/manage/loyalty",
    available: true,
  },
];
