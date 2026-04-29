"use client";

// src/components/portal/portal-header.tsx
// Notifications now wired to real DB via server action

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import { staffSignOutAction }      from "@/actions/auth/staff";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/portal/notifications";
import { ROUTES }                  from "@/routes";
import { useTheme }                from "@/components/providers/theme-provider";
import { Button }                  from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Building2, ChevronDown, LogOut, Moon, Sun, Bell,
  Shield, ArrowLeft, Settings, User, Loader2,
  ArrowRight, PackageCheck, PackageX, Ban, AlertTriangle, Info,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface NotificationItem {
  id:           string;
  type:         string;
  title:        string;
  message:      string;
  isRead:       boolean;
  actionUrl:    string | null;
  createdAt:    Date | string;
}

interface PortalHeaderProps {
  siteId:        string;
  siteName:      string;
  otherSites:    { siteId: string; name: string }[];
  user:          { name: string; username: string; isMaster: boolean };
  notifications: NotificationItem[];
  unreadCount:   number;
}

// ─────────────────────────────────────────────────────────────
// Notification type → icon
// ─────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  if (type === "TRANSFER_INCOMING") return <PackageCheck className="h-4 w-4 text-info" />;
  if (type === "TRANSFER_ACCEPTED") return <PackageCheck className="h-4 w-4 text-success" />;
  if (type === "TRANSFER_REJECTED") return <PackageX     className="h-4 w-4 text-danger" />;
  if (type === "TRANSFER_CANCELLED") return <Ban         className="h-4 w-4 text-muted-foreground" />;
  if (type === "LOW_STOCK")         return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
}

function timeAgo(date: Date | string) {
  const d    = typeof date === "string" ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60)   return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ─────────────────────────────────────────────────────────────
// Notification panel
// ─────────────────────────────────────────────────────────────

function NotifPanel({
  siteId, notifications, unreadCount, onClose,
}: {
  siteId:        string;
  notifications: NotificationItem[];
  unreadCount:   number;
  onClose:       () => void;
}) {
  const router              = useRouter();
  const [items, setItems]   = useState(notifications);
  const [unread, setUnread] = useState(unreadCount);
  const [, startTransition] = useTransition();

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction(siteId);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    });
  };

  const handleClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      startTransition(async () => {
        await markNotificationReadAction(notif.id, siteId);
        setItems((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnread((p) => Math.max(0, p - 1));
      });
    }
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <span className="bg-foreground text-background text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAllRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full flex gap-3 px-5 py-4 hover:bg-muted/40 transition-colors text-left ${!n.isRead ? "bg-muted/20" : ""}`}
            >
              <div className="mt-0.5 shrink-0">
                <NotifIcon type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-xs text-muted-foreground/50 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
              {n.actionUrl && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border text-center">
        <Link
          href={`/portal/${siteId}/inventory/transfers`}
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all transfers
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────

export function PortalHeader({
  siteId, siteName, otherSites, user, notifications, unreadCount,
}: PortalHeaderProps) {
  const router                        = useRouter();
  const { theme, toggleTheme }        = useTheme();
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [isPending,   startTransition] = useTransition();

  const initials = user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  function handleSignOut() {
    startTransition(async () => { await staffSignOutAction(); });
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="px-5 h-16 flex items-center gap-3">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted hover:border-foreground/20 transition-all shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Site identity */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-background" />
          </div>
          <span className="font-semibold text-sm truncate max-w-40">{siteName}</span>

          {!user.isMaster && otherSites.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1 rounded-xl shrink-0">
                  Switch <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 rounded-2xl p-1.5">
                {otherSites.map((s) => (
                  <DropdownMenuItem key={s.siteId} asChild className="rounded-xl gap-3 cursor-pointer">
                    <Link href={ROUTES.staff.site(s.siteId)}>
                      <div className="w-6 h-6 rounded-lg bg-foreground flex items-center justify-center shrink-0">
                        <Building2 className="h-3 w-3 text-background" />
                      </div>
                      {s.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user.isMaster && (
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg shrink-0">
              Previewing as admin
            </span>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">

          <button onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((p) => !p)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full ring-2 ring-background" />
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="relative z-50">
                  <NotifPanel
                    siteId={siteId}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onClose={() => setNotifOpen(false)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-xl hover:bg-muted transition-colors ml-1 outline-none">
                <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-background">{initials}</span>
                </div>
                <span className="text-sm font-medium hidden sm:block max-w-28 truncate">{user.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
              <div className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-background">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {user.isMaster ? <><Shield className="h-3 w-3 shrink-0" /> Admin</> : `@${user.username}`}
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-xl gap-3 cursor-pointer" asChild>
                <Link href={`/portal/${siteId}/profile`}><User className="h-4 w-4" /> My Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl gap-3 cursor-pointer" asChild>
                <Link href={`/portal/${siteId}/settings`}><Settings className="h-4 w-4" /> Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme} className="rounded-xl gap-3 cursor-pointer">
                {theme === "dark" ? <><Sun className="h-4 w-4" /> Light mode</> : <><Moon className="h-4 w-4" /> Dark mode</>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.isMaster ? (
                <DropdownMenuItem asChild className="rounded-xl gap-3 cursor-pointer">
                  <Link href={ROUTES.dashboard.sites}><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleSignOut} disabled={isPending}
                  className="rounded-xl gap-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {isPending ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}