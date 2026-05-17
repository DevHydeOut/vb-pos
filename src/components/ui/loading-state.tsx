"use client";

import { Building2, Loader2 } from "lucide-react";

interface AppLoaderProps {
  inline?: boolean;
  label?: string;
}

export function AppLoader({ inline = false, label = "Loading workspace" }: AppLoaderProps) {
  if (inline) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card">
        <LoaderMark />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background">
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-muted">
        <div className="h-full w-1/3 animate-progress-bar rounded-r-full bg-foreground" />
      </div>
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-10 py-8 shadow-sm">
        <LoaderMark large />
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold">POS Manager</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function LoaderMark({ large = false }: { large?: boolean }) {
  const box = large ? "h-14 w-14" : "h-11 w-11";
  const icon = large ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className="relative">
      <div className="absolute inset-[-6px] rounded-2xl border border-border" />
      <div className={`${box} flex items-center justify-center rounded-2xl bg-foreground`}>
        <Building2 className={`${icon} text-background`} />
      </div>
      <Loader2 className="absolute -right-2 -top-2 h-5 w-5 animate-spin rounded-full bg-background text-muted-foreground" />
    </div>
  );
}

export function PageSpinner() { return <AppLoader inline />; }
export function PortalListLoading() { return <AppLoader />; }
export function PortalFormLoading() { return <AppLoader />; }
export function DashboardListLoading() { return <AppLoader />; }
export function ListSkeleton() { return <AppLoader inline />; }
export function FormSkeleton() { return <AppLoader inline />; }
