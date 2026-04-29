"use client";

// src/app/(structure)/error.tsx
// Catches any unhandled error inside the entire (structure) group:
// all /dashboard/* and /portal/* routes bubble up to here
// if they don't have their own error.tsx closer to them.

import { ErrorState } from "@/components/ui/error-state";

export default function StructureError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <ErrorState error={error} reset={reset} />
    </div>
  );
}