"use client";

// src/components/shared/loading-state.tsx
//
// ONE loading component for the entire app.
// Use this everywhere instead of page-specific skeletons.
//
// Usage:
//   // Full page (default) — centered logo + progress bar
//   <AppLoader />
//
//   // Inside a panel/section (no full-screen overlay)
//   <AppLoader inline />
//
//   // Next.js loading.tsx files:
//   export default function Loading() { return <AppLoader />; }
//
//   // Inside a client component while pending:
//   if (isPending) return <AppLoader inline />;

import { Building2 } from "lucide-react";

// ─── Main export ──────────────────────────────────────────────────────────────

interface AppLoaderProps {
  /** Renders inline (no fixed overlay) — for sections/panels */
  inline?: boolean;
  /** Optional label shown below the logo */
  label?: string;
}

export function AppLoader({ inline = false, label }: AppLoaderProps) {
  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <LogoSpinner />
        {label && <p className="text-sm text-muted-foreground">{label}</p>}
      </div>
    );
  }

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-100 h-0.5 bg-foreground/8 overflow-hidden">
        <div className="h-full bg-foreground animate-progress-bar" />
      </div>

      {/* Full-screen centered logo */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <LogoSpinner size="lg" />
          {label && (
            <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Logo spinner ─────────────────────────────────────────────────────────────

function LogoSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const outer = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-8 h-8" : "w-12 h-12";
  const icon  = size === "lg" ? "h-7 w-7"   : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const ring  = size === "lg" ? "inset-[-6px]" : size === "sm" ? "inset-[-4px]" : "inset-[-5px]";

  return (
    <div className="relative flex items-center justify-center">
      {/* Spinning ring */}
      <div className={`absolute ${ring} rounded-full border-2 border-transparent
        border-t-foreground/50 border-r-foreground/20 animate-spin`}
      />
      {/* Logo icon */}
      <div className={`${outer} rounded-2xl bg-foreground flex items-center justify-center`}>
        <Building2 className={`${icon} text-background`} />
      </div>
    </div>
  );
}

// ─── Convenience re-exports (backwards compat) ────────────────────────────────

/** @deprecated Use <AppLoader /> */
export function PageSpinner()          { return <AppLoader inline />; }
/** @deprecated Use <AppLoader /> */
export function PortalListLoading()    { return <AppLoader />; }
/** @deprecated Use <AppLoader /> */
export function PortalFormLoading()    { return <AppLoader />; }
/** @deprecated Use <AppLoader /> */
export function DashboardListLoading() { return <AppLoader />; }
/** @deprecated Use <AppLoader /> */
export function ListSkeleton()         { return <AppLoader inline />; }
/** @deprecated Use <AppLoader /> */
export function FormSkeleton()         { return <AppLoader inline />; }