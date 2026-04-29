"use client";

// src/components/shared/empty-state.tsx
//
// Consistent empty state for ALL list pages, grids, and search results.
// Replaces 179 inline "No X found" messages with one component.
//
// Usage:
//   // Basic
//   <EmptyState
//     icon={Package}
//     title="No products yet"
//     description="Add your first product to get started"
//   />
//
//   // With action button
//   <EmptyState
//     icon={Package}
//     title="No products yet"
//     description="Products you add will appear here"
//     action={<Button onClick={handleAdd}><Plus /> Add Product</Button>}
//   />
//
//   // Search result (smaller, inline)
//   <EmptyState
//     icon={Search}
//     title="No results for "headphones""
//     description="Try a different search term or clear filters"
//     size="sm"
//   />
//
//   // Full page (centered in full viewport height)
//   <EmptyState
//     icon={ShoppingCart}
//     title="Cart is empty"
//     size="lg"
//   />

import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  /** Lucide icon to display */
  icon: LucideIcon;
  /** Main heading */
  title: string;
  /** Optional supporting text */
  description?: string;
  /** Optional action button/link */
  action?: React.ReactNode;
  /**
   * Size variant:
   *   sm  → compact, inline (inside a panel or table)
   *   md  → default (most pages)
   *   lg  → full page / hero style
   */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    wrapper:     "py-10 px-6",
    iconWrapper: "w-10 h-10 rounded-xl",
    iconSize:    "h-5 w-5",
    title:       "text-sm font-semibold",
    description: "text-xs",
  },
  md: {
    wrapper:     "py-16 px-8",
    iconWrapper: "w-14 h-14 rounded-2xl",
    iconSize:    "h-7 w-7",
    title:       "text-base font-semibold",
    description: "text-sm",
  },
  lg: {
    wrapper:     "py-24 px-8",
    iconWrapper: "w-20 h-20 rounded-3xl",
    iconSize:    "h-10 w-10",
    title:       "text-xl font-semibold",
    description: "text-base",
  },
} as const;

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className = "",
}: EmptyStateProps) {
  const config = SIZE_CONFIG[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${config.wrapper} ${className}`}>
      {/* Icon */}
      <div className={`${config.iconWrapper} bg-muted flex items-center justify-center mb-4 shrink-0`}>
        <Icon className={`${config.iconSize} text-muted-foreground/50`} />
      </div>

      {/* Text */}
      <div className="space-y-1.5 max-w-sm">
        <p className={`text-foreground ${config.title}`}>{title}</p>
        {description && (
          <p className={`text-muted-foreground leading-relaxed ${config.description}`}>
            {description}
          </p>
        )}
      </div>

      {/* Action */}
      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
}