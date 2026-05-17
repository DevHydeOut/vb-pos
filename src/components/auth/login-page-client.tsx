"use client";

import { useState }  from "react";
import { LoginForm } from "@/components/auth/login-form";
import { StaffForm } from "@/components/auth/staff-form";
import { cn }        from "@/lib/utils";
import { BarChart3, Building2, Receipt, ShieldCheck, Users } from "lucide-react";

export function LoginPageClient() {
  const [tab, setTab] = useState<"root" | "staff">("root");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-size-[3rem_3rem] opacity-30" />

      <div className="relative grid min-h-screen lg:grid-cols-[1fr_480px]">
        <section className="hidden flex-col justify-between border-r border-border bg-muted/20 p-10 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground">
              <Building2 className="h-5 w-5 text-background" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">POS Manager</h1>
              <p className="text-sm text-muted-foreground">Single-owner retail operations</p>
            </div>
          </div>

          <div className="max-w-2xl space-y-7">
            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Retail command center</p>
              <h2 className="max-w-xl text-5xl font-bold tracking-tight">
                Stock, POS billing and royalty points in one workspace.
              </h2>
              <p className="max-w-lg text-base leading-7 text-muted-foreground">
                Manage sites, staff access, customer points, rewards, reports and product stock without SaaS workspace clutter.
              </p>
            </div>

            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                { label: "Site stock", icon: Building2 },
                { label: "Fast billing", icon: Receipt },
                { label: "Sales reports", icon: BarChart3 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <p className="mt-3 text-sm font-semibold">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Secure owner and staff access</p>
        </section>

        <section className="flex min-h-screen items-center justify-center p-5">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center lg:hidden">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground">
                <ShieldCheck className="h-6 w-6 text-background" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">POS Manager</h1>
              <p className="text-sm text-muted-foreground">Stock, billing and royalty points</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

              <div className="grid grid-cols-2 border-b border-border bg-muted/30 p-1">
                <button
                  onClick={() => setTab("root")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition",
                    tab === "root" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ShieldCheck className="h-4 w-4" /> Owner
                </button>
                <button
                  onClick={() => setTab("staff")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition",
                    tab === "staff" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="h-4 w-4" /> Staff
                </button>
              </div>

              <div className="p-7">
                {tab === "root" ? (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold">Owner Login</h2>
                      <p className="text-sm text-muted-foreground">Sign in with the master Google account.</p>
                    </div>
                    <LoginForm />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold">Staff Login</h2>
                      <p className="text-sm text-muted-foreground">Use the account ID and username from your admin.</p>
                    </div>
                    <StaffForm />
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Protected login for owner and staff accounts
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
