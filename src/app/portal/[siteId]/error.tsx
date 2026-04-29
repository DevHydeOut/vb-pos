"use client";

// src/app/(structure)/portal/[siteId]/error.tsx
// Overrides the structure-level error for all portal routes.
// Key difference: pb-24 bottom padding to clear the floating bottom nav,
// and a more mobile-friendly centered layout.

import { ErrorState } from "@/components/ui/error-state";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] pb-24 px-4">
      <ErrorState error={error} reset={reset} />
    </div>
  );
}