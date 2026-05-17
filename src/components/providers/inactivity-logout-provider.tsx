"use client";

import { useEffect } from "react";
import { logoutCurrentSessionAction } from "@/actions/auth/session";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const EVENTS = ["click", "keydown", "pointermove", "scroll", "touchstart"] as const;

export function InactivityLogoutProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let timeoutId: number | null = null;
    let signingOut = false;

    const signOutForIdle = async () => {
      if (signingOut) return;
      signingOut = true;
      await logoutCurrentSessionAction().catch(() => {});
      window.location.assign("/login?timeout=1");
    };

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(signOutForIdle, IDLE_TIMEOUT_MS);
    };

    resetTimer();
    for (const eventName of EVENTS) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      for (const eventName of EVENTS) {
        window.removeEventListener(eventName, resetTimer);
      }
    };
  }, []);

  return children;
}
