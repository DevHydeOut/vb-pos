// src/components/shared/page-header.tsx
//
// Consistent page header for ALL portal pages.
// Replaces 47 files each doing their own inline title/subtitle pattern.
//
// Usage:
//   // Basic
//   <PageHeader title="Products" description="Manage your inventory" />
//
//   // With back button
//   <PageHeader
//     title="Edit Product"
//     description="Wireless Headphones Pro"
//     backHref={`/portal/${siteId}/inventory/products`}
//   />
//
//   // With action button
//   <PageHeader
//     title="Products"
//     description="24 products across 6 categories"
//     action={
//       <Button onClick={handleAdd}>
//         <Plus /> Add Product
//       </Button>
//     }
//   />
//
//   // With back + action + breadcrumb
//   <PageHeader
//     title="Stock History"
//     description="All stock movements for Game Store"
//     backHref={`/portal/${siteId}/inventory`}
//     action={<Button variant="outline"><Download /> Export</Button>}
//   />

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** If provided, renders a back arrow button linking to this href */
  backHref?: string;
  /** Optional action element (Button, dropdown, etc.) rendered right side */
  action?: React.ReactNode;
  /** Extra content below title row (e.g. tabs, filters) */
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  action,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Button
              variant="ghost"
              size="icon-sm"
              asChild
              className="shrink-0 -ml-1"
            >
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Link>
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: action */}
        {action && (
          <div className="shrink-0">{action}</div>
        )}
      </div>

      {/* Optional sub-content (tabs, filters, etc.) */}
      {children && (
        <div className="pt-1">{children}</div>
      )}
    </div>
  );
}