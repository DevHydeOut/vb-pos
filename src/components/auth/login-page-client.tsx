"use client";

import { useState }  from "react";
import { LoginForm } from "@/components/auth/login-form";
import { StaffForm } from "@/components/auth/staff-form";
import { cn }        from "@/lib/utils";
import { ShieldCheck, Users } from "lucide-react";

export function LoginPageClient() {
  const [tab, setTab] = useState<"root" | "staff">("root");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">

      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-size-[3rem_3rem] opacity-40" />

      <div className="relative w-full max-w-md space-y-8">

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-foreground mb-2">
            <ShieldCheck className="h-6 w-6 text-background" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">POSS</h1>
          <p className="text-sm text-muted-foreground">Point of Sale System</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">

          {/* Tab switcher */}
          <div className="grid grid-cols-2 border-b border-border">
            <button
              onClick={() => setTab("root")}
              className={cn(
                "flex items-center justify-center gap-2 py-4 text-sm font-medium",
                tab === "root" ? "tab-active" : "tab-inactive"
              )}
            >
              <ShieldCheck className="h-4 w-4" /> Owner
            </button>
            <button
              onClick={() => setTab("staff")}
              className={cn(
                "flex items-center justify-center gap-2 py-4 text-sm font-medium",
                tab === "staff" ? "tab-active" : "tab-inactive"
              )}
            >
              <Users className="h-4 w-4" /> Staff
            </button>
          </div>

          {/* Form */}
          <div className="p-8">
            {tab === "root" ? (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Owner Login</h2>
                  <p className="text-sm text-muted-foreground">Sign in with your Google account</p>
                </div>
                <LoginForm />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Staff Login</h2>
                  <p className="text-sm text-muted-foreground">Sign in with your company credentials</p>
                </div>
                <StaffForm />
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Secure · Encrypted · Enterprise-grade
        </p>
      </div>
    </div>
  );
}