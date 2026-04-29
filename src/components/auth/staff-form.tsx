"use client";

import { useState, useTransition } from "react";
import { staffLoginAction }        from "@/actions/auth/staff";
import { useRouter }               from "next/navigation";
import { ROUTES }                  from "@/routes";
import { Input }                   from "@/components/ui/input";
import { Button }                  from "@/components/ui/button";
import { Building2, User, Lock, Loader2, AlertTriangle, ShieldOff } from "lucide-react";

export function StaffForm() {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error,     setError]        = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [locked,    setLocked]       = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await staffLoginAction(formData);

      if (res.success) {
        router.push(ROUTES.staff.sitePicker);
        router.refresh();
      } else {
        setError(res.error);

        if ("lockedFor" in res && res.lockedFor) {
          setLocked(true);
          setAttemptsLeft(0);
        } else if ("attemptsLeft" in res && res.attemptsLeft !== undefined) {
          setAttemptsLeft(res.attemptsLeft);
          setLocked(false);
        }
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">

      {/* Lockout banner */}
      {locked && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <ShieldOff className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive leading-snug">{error}</p>
        </div>
      )}

      {/* Error + attempts remaining */}
      {!locked && error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm text-destructive leading-snug">{error}</p>
            {attemptsLeft !== null && attemptsLeft > 0 && (
              <p className="text-xs text-destructive/70">
                {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before lockout
              </p>
            )}
          </div>
        </div>
      )}

      {/* Account ID */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          Account ID
        </label>
        <Input
          name="accountId"
          placeholder="ACC-123456"
          disabled={isPending || locked}
          className="uppercase tracking-widest font-mono h-11"
          onChange={(e) => (e.target.value = e.target.value.toUpperCase())}
        />
        <p className="text-xs text-muted-foreground">Provided by your administrator</p>
      </div>

      {/* Username */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          Username
        </label>
        <Input
          name="username"
          placeholder="john_doe"
          disabled={isPending || locked}
          className="h-11"
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          Password
        </label>
        <Input
          name="password"
          type="password"
          placeholder="••••••••"
          disabled={isPending || locked}
          className="h-11"
        />
      </div>

      {/* Attempt dots — 3 circles that go red as attempts are used */}
      {attemptsLeft !== null && !locked && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Attempts:</span>
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < (3 - attemptsLeft) ? "bg-destructive" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending || locked}
        className="w-full h-11 font-medium"
      >
        {isPending
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
          : locked ? "Account locked" : "Sign in"
        }
      </Button>
    </form>
  );
}