"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useTheme }    from "@/components/providers/theme-provider";
import Link            from "next/link";
import { ROUTES }      from "@/routes";
import { toast }       from "sonner";
import {
  LayoutDashboard, Building2, Users, Settings,
  Sun, Moon, Copy, Check, LogOut, ChevronDown,
  MoreHorizontal, Layers, ChevronRight, User,
} from "lucide-react";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction }    from "@/actions/auth/master";
import { MANAGE_RESOURCES } from "@/config/manage-resources";

interface Site    { id: string; name: string }
interface NavItem { label: string; href: string; icon: React.ReactNode }

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard.home,  icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Sites",     href: ROUTES.dashboard.sites, icon: <Building2 className="w-4 h-4" /> },
  { label: "Staff",     href: ROUTES.dashboard.staff, icon: <Users className="w-4 h-4" /> },
];

export function DashboardSidebar({
  accountId,
  userName,
  userEmail,
  userImage,
  sites,
  currentSiteId,
}: {
  accountId:      string;
  userName:       string;
  userEmail:      string;
  userImage?:     string | null;
  sites:          Site[];
  currentSiteId?: string;
}) {
  const pathname               = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [copied,       setCopied]    = useState(false);
  const [manageOpen,   setManageOpen] = useState(
    pathname.startsWith(ROUTES.dashboard.manage.root)
  );
  const [isSigningOut, startSignOut] = useTransition();

  function copyAccountId() {
    navigator.clipboard.writeText(accountId);
    setCopied(true);
    toast.success("Account ID copied");
    setTimeout(() => setCopied(false), 2000);
  }

  function navClass(href: string, exact = false) {
    const isActive = exact
      ? pathname === href
      : pathname.startsWith(href);
    return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? "bg-foreground text-background"
        : "text-sidebar-foreground hover:bg-sidebar-accent"
    }`;
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 z-30 flex flex-col bg-sidebar border-r border-sidebar-border">

      {/* ── Logo ──────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href={ROUTES.dashboard.home} className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-foreground rounded-xl flex items-center justify-center shrink-0">
            <span className="text-background text-xs font-black tracking-tight">P</span>
          </div>
          <span className="text-base font-bold text-sidebar-foreground tracking-tight">POSS</span>
        </Link>
      </div>

      {/* ── Site switcher ──────────────────────────────── */}
      {sites.length > 0 && (
        <div className="px-3 pt-4 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-sidebar-accent hover:bg-border/60 transition-colors text-left">
                <div className="w-6 h-6 bg-foreground/10 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-sidebar-foreground" />
                </div>
                <span className="text-sm font-medium text-sidebar-foreground flex-1 truncate">
                  {currentSiteId
                    ? sites.find((s) => s.id === currentSiteId)?.name ?? "All sites"
                    : "All sites"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-sidebar-muted shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem asChild>
                <Link href={ROUTES.dashboard.home}>All sites</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {sites.map((site) => (
                <DropdownMenuItem key={site.id} asChild>
                  <Link href={ROUTES.dashboard.site(site.id)}>{site.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Nav ───────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">

        {/* Main nav items */}
        <Link href={ROUTES.dashboard.home} className={navClass(ROUTES.dashboard.home, true)}>
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </Link>
        <Link href={ROUTES.dashboard.sites} className={navClass(ROUTES.dashboard.sites)}>
          <Building2 className="w-4 h-4" /> Sites
        </Link>
        <Link href={ROUTES.dashboard.staff} className={navClass(ROUTES.dashboard.staff)}>
          <Users className="w-4 h-4" /> Staff
        </Link>

        {/* ── Manage section ────────────────────────── */}
        <div className="pt-3">
          <p className="px-3 pb-1.5 text-xs font-semibold text-sidebar-muted uppercase tracking-widest">
            Core
          </p>

          {/* Collapsible trigger */}
          <button
            onClick={() => setManageOpen((p) => !p)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              pathname.startsWith("/dashboard/manage")
                ? "bg-foreground text-background"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}>
            <Layers className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">POS Modules</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${manageOpen ? "rotate-90" : ""}`} />
          </button>

          {/* Expanded resource list */}
          {manageOpen && (
            <div className="mt-0.5 ml-3 pl-4 border-l border-sidebar-border space-y-0.5">
              {MANAGE_RESOURCES.map((r) => {
                const Icon     = r.icon;
                const isActive = pathname.startsWith(r.path);
                return (
                  <Link key={r.key} href={r.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                      isActive
                        ? "bg-foreground text-background font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">{r.label}</span>
                    {!r.available && (
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-lg">
                        Soon
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="pt-3">
          <p className="px-3 pb-1.5 text-xs font-semibold text-sidebar-muted uppercase tracking-widest">
            Settings
          </p>
          <Link href="/dashboard/settings/loyalty"
            className={navClass("/dashboard/settings/loyalty")}>
            <Settings className="w-4 h-4" /> Royalty Points
          </Link>
        </div>

        {/* Notifications */}
        <div className="pt-1">
          <NotificationBell />
        </div>

        {/* Profile */}
        <Link href={ROUTES.dashboard.profile} className={navClass(ROUTES.dashboard.profile)}>
          <User className="w-4 h-4" /> Profile
        </Link>

      </nav>

      {/* ── Account ID ────────────────────────────────── */}
      <div className="px-3 pb-3">
        <button onClick={copyAccountId}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent transition-colors text-left group">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-sidebar-muted">Account ID</p>
            <p className="text-xs font-mono font-semibold text-sidebar-foreground truncate">{accountId}</p>
          </div>
          {copied
            ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
            : <Copy  className="w-3.5 h-3.5 text-sidebar-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          }
        </button>
      </div>

      {/* ── Bottom ────────────────────────────────────── */}
      <div className="px-3 pb-5 pt-2 border-t border-sidebar-border space-y-0.5">

        <button onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              {userImage ? (
                <img src={userImage} alt={userName} className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 bg-foreground rounded-full flex items-center justify-center shrink-0">
                  <span className="text-background text-xs font-bold">{userName.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-sidebar-muted truncate">{userEmail}</p>
              </div>
              <MoreHorizontal className="w-4 h-4 text-sidebar-muted shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52 mb-1">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <DropdownMenuItem asChild>
              <Link href={ROUTES.dashboard.profile}>
                <User className="mr-2 h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={ROUTES.dashboard.globalSettings.loyalty}>
                <Settings className="mr-2 h-4 w-4" /> Royalty Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => startSignOut(async () => { await signOutAction(); })}
              disabled={isSigningOut}
              className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </aside>
  );
}
