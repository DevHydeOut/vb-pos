// src/components/shared/status-badge.tsx
//
// Semantic status badge for ALL status indicators across the app.
// Uses design tokens from globals.css — updates everywhere when tokens change.
//
// Replaces all inline status chips like:
//   <span className="text-xs bg-success-muted text-success-muted px-2 py-0.5 rounded-full">Active</span>
//
// Usage:
//   <StatusBadge status="active" />
//   <StatusBadge status="pending" />
//   <StatusBadge status="out_of_stock" label="Out of Stock" />
//   <StatusBadge status="success" label="Completed" size="sm" />
//
// You can also pass any custom status with explicit color:
//   <StatusBadge status="custom" label="On Route" color="info" />

import { cn } from "@/lib/utils";

// ─── Status map ───────────────────────────────────────────────────────────────
// Add new statuses here. They'll be available everywhere automatically.
type StatusColor = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_MAP: Record<string, { label: string; color: StatusColor }> = {
  // Generic
  active:      { label: "Active",      color: "success" },
  inactive:    { label: "Inactive",    color: "neutral" },
  enabled:     { label: "Enabled",     color: "success" },
  disabled:    { label: "Disabled",    color: "neutral" },

  // Order / workflow
  completed:   { label: "Completed",   color: "success" },
  confirmed:   { label: "Confirmed",   color: "success" },
  pending:     { label: "Pending",     color: "warning" },
  processing:  { label: "Processing",  color: "info"    },
  on_hold:     { label: "On Hold",     color: "warning" },
  cancelled:   { label: "Cancelled",  color: "danger"  },
  rejected:    { label: "Rejected",    color: "danger"  },
  failed:      { label: "Failed",      color: "danger"  },
  draft:       { label: "Draft",       color: "neutral" },
  scheduled:   { label: "Scheduled",   color: "info"    },

  // Stock levels
  in_stock:    { label: "In Stock",    color: "success" },
  low_stock:   { label: "Low Stock",   color: "warning" },
  out_of_stock:{ label: "Out of Stock",color: "danger"  },

  // Transfers
  in_transit:  { label: "In Transit",  color: "info"    },
  received:    { label: "Received",    color: "success" },
  partial:     { label: "Partial",     color: "warning" },

  // Payments
  paid:        { label: "Paid",        color: "success" },
  unpaid:      { label: "Unpaid",      color: "danger"  },
  refunded:    { label: "Refunded",    color: "neutral" },
  overdue:     { label: "Overdue",     color: "danger"  },
} as const;

// ─── Color classes ────────────────────────────────────────────────────────────
const COLOR_CLASSES: Record<StatusColor, string> = {
  success: "bg-success-muted text-success-muted border-success/20",
  warning: "bg-warning-muted text-warning-muted border-warning/20",
  danger:  "bg-danger-muted  text-danger-muted  border-danger/20",
  info:    "bg-info-muted    text-info-muted    border-info/20",
  neutral: "bg-muted         text-muted-foreground border-border",
};

const DOT_CLASSES: Record<StatusColor, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  info:    "bg-info",
  neutral: "bg-muted-foreground",
};

// ─── Size classes ─────────────────────────────────────────────────────────────
const SIZE_CLASSES = {
  xs: "text-xs px-1.5 py-0 gap-1",
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
} as const;

const DOT_SIZE_CLASSES = {
  xs: "w-1 h-1",
  sm: "w-1.5 h-1.5",
  md: "w-1.5 h-1.5",
} as const;

// ─── Component ────────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  /** Predefined status key from STATUS_MAP, or any string with explicit color */
  status: string;
  /** Override the display label. If not provided, uses STATUS_MAP label or the status string */
  label?: string;
  /** Override the color. If not provided, uses STATUS_MAP color or "neutral" */
  color?: StatusColor;
  /** Size variant. Default: "sm" */
  size?: "xs" | "sm" | "md";
  /** Show colored dot. Default: true */
  dot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  color,
  size  = "sm",
  dot   = true,
  className,
}: StatusBadgeProps) {
  const config    = STATUS_MAP[status];
  const finalColor = color ?? config?.color ?? "neutral";
  const finalLabel = label ?? config?.label ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border whitespace-nowrap",
        SIZE_CLASSES[size],
        COLOR_CLASSES[finalColor],
        className,
      )}
    >
      {dot && (
        <span className={cn("rounded-full shrink-0", DOT_SIZE_CLASSES[size], DOT_CLASSES[finalColor])} />
      )}
      {finalLabel}
    </span>
  );
}

// ─── Stock level helper ───────────────────────────────────────────────────────
// Convenience component for the very common stock level indicator
interface StockBadgeProps {
  stock: number;
  lowThreshold?: number;
  size?: StatusBadgeProps["size"];
}

export function StockBadge({ stock, lowThreshold = 5, size = "sm" }: StockBadgeProps) {
  if (stock === 0)              return <StatusBadge status="out_of_stock" size={size} />;
  if (stock <= lowThreshold)    return <StatusBadge status="low_stock" label={`Low (${stock})`} size={size} />;
  return <StatusBadge status="in_stock" label={`${stock} in stock`} size={size} />;
}