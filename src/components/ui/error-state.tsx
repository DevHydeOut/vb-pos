"use client";

// src/components/ui/error-state.tsx

import { useEffect }   from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, RefreshCcw, ChevronLeft } from "lucide-react";

/* ── Back URL inference from pathname ────────────────────────── */
function inferBackUrl(pathname: string): { url: string; label: string } | null {
  const p = pathname;

  // Portal: /portal/[siteId]/inventory/products/[id] → products list
  if (/\/portal\/[^/]+\/inventory\/products\/[^/]+/.test(p)) {
    const siteId = p.split("/")[2];
    return { url: `/portal/${siteId}/inventory/products`, label: "Products" };
  }
  // Portal: /portal/[siteId]/customers/[id] → customers list
  if (/\/portal\/[^/]+\/customers\/[^/]+/.test(p)) {
    const siteId = p.split("/")[2];
    return { url: `/portal/${siteId}/customers`, label: "Customers" };
  }
  // Portal: any deep page → go up one level
  if (/\/portal\/[^/]+\/.+\/.+/.test(p)) {
    const parts = p.split("/").filter(Boolean); // ["portal","siteId","module","page"]
    parts.pop();
    return { url: "/" + parts.join("/"), label: "Back" };
  }
  // Portal: module page → site home
  if (/\/portal\/[^/]+\/.+/.test(p)) {
    const siteId = p.split("/")[2];
    return { url: `/portal/${siteId}`, label: "Site Home" };
  }
  // Dashboard manage detail → list
  if (/\/dashboard\/manage\/[^/]+\/[^/]+/.test(p)) {
    const parts = p.split("/").filter(Boolean);
    parts.pop();
    return { url: "/" + parts.join("/"), label: "Back" };
  }
  // Dashboard manage list → dashboard home
  if (/\/dashboard\/manage/.test(p)) {
    return { url: "/dashboard", label: "Dashboard" };
  }
  // Dashboard settings → dashboard
  if (/\/dashboard\/settings/.test(p)) {
    return { url: "/dashboard", label: "Dashboard" };
  }
  // Dashboard → nothing (already at top)
  return null;
}

/* ── Component ───────────────────────────────────────────────── */

interface ErrorStateProps {
  error:     Error & { digest?: string };
  reset:     () => void;
  title?:    string;
  fullPage?: boolean;
}

export function ErrorState({
  error,
  reset,
  title    = "Something went wrong",
  fullPage = false,
}: ErrorStateProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const back     = inferBackUrl(pathname);

  useEffect(() => { console.error(error); }, [error]);

  const content = (
    <div className="flex flex-col items-center justify-center gap-5 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => router.push(back.url)}
            className="flex items-center gap-2 px-4 py-2.5 border border-border
              rounded-xl text-sm hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4" /> {back.label}
          </button>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background
            rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <RefreshCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-20">
      {content}
    </div>
  );
}