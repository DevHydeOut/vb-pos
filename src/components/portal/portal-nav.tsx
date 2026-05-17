"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Settings,
  SlidersHorizontal,
  Star,
  Users,
} from "lucide-react";
import { ROUTES } from "@/routes";

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory: Package,
  billing: Receipt,
  loyalty: Star,
};

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "inventory.products": Boxes,
  "inventory.stock": Boxes,
  "inventory.adjust": SlidersHorizontal,
  "inventory.transfers": ArrowLeftRight,
  "billing.pos": Receipt,
  "billing.analytics": BarChart3,
  "loyalty.customers": Users,
  "loyalty.rewards": Star,
};

interface NavPage { id: string; key: string; label: string }
interface NavModule { key: string; label: string; pages: NavPage[] }

interface PortalNavProps {
  siteId: string;
  modules: NavModule[];
  pendingTransferCount?: number;
}

export function PortalNav({ siteId, modules, pendingTransferCount = 0 }: PortalNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("portal-sidebar-collapsed") === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("portal-sidebar-collapsed", String(next));
      return next;
    });
  }

  const relative = pathname.replace(`/portal/${siteId}`, "");
  const parts = relative.split("/").filter(Boolean);
  const currentMod = parts[0] ?? null;
  const currentPg = parts[1] ?? null;

  function itemClass(active: boolean) {
    return `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-foreground text-background"
        : "text-sidebar-foreground hover:bg-sidebar-accent"
    }`;
  }

  return (
    <>
    <aside
      className={`hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex lg:flex-col ${
        collapsed ? "w-16" : "w-72"
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-3">
        <Link href={ROUTES.staff.site(siteId)} className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground">
            <span className="text-xs font-black text-background">P</span>
          </div>
          {!collapsed && <span className="truncate text-base font-bold">POS Workspace</span>}
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-sidebar-accent"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <Link href={ROUTES.staff.site(siteId)} className={itemClass(pathname === ROUTES.staff.site(siteId))}>
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Workspace</span>}
        </Link>

        {modules.map((module) => {
          const ModuleIcon = MODULE_ICONS[module.key] ?? Menu;
          const moduleActive = currentMod === module.key;

          return (
            <div key={module.key} className="space-y-1">
              <Link href={ROUTES.staff.module(siteId, module.key)} className={itemClass(moduleActive && !currentPg)}>
                <ModuleIcon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{module.label}</span>}
              </Link>

              {!collapsed && module.pages.length > 0 && (
                <div className="ml-3 space-y-1 border-l border-sidebar-border pl-3">
                  {module.pages.map((page) => {
                    const pageKey = page.key.split(".")[1];
                    const active = currentMod === module.key && currentPg === pageKey;
                    const PageIcon = PAGE_ICONS[page.key] ?? FileText;
                    const showBadge = page.key === "inventory.transfers" && pendingTransferCount > 0;

                    return (
                      <Link
                        key={page.id}
                        href={ROUTES.staff.page(siteId, module.key, pageKey)}
                        className={itemClass(active)}
                      >
                        <PageIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{page.label}</span>
                        {showBadge && (
                          <span className="rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {pendingTransferCount > 9 ? "9+" : pendingTransferCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link href={ROUTES.staff.profile(siteId)} className={itemClass(pathname === ROUTES.staff.profile(siteId))}>
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Profile</span>}
        </Link>
      </div>
    </aside>

    <nav className="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-2xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur lg:hidden">
      <Link href={ROUTES.staff.site(siteId)} className={itemClass(pathname === ROUTES.staff.site(siteId))}>
        <LayoutDashboard className="h-4 w-4 shrink-0" />
      </Link>
      {modules.flatMap((module) => {
        const ModuleIcon = MODULE_ICONS[module.key] ?? Menu;
        const moduleHome = (
          <Link
            key={module.key}
            href={ROUTES.staff.module(siteId, module.key)}
            className={itemClass(currentMod === module.key && !currentPg)}
          >
            <ModuleIcon className="h-4 w-4 shrink-0" />
          </Link>
        );
        return [
          moduleHome,
          ...module.pages.map((page) => {
            const pageKey = page.key.split(".")[1];
            const active = currentMod === module.key && currentPg === pageKey;
            const PageIcon = PAGE_ICONS[page.key] ?? FileText;
            return (
              <Link
                key={page.id}
                href={ROUTES.staff.page(siteId, module.key, pageKey)}
                className={itemClass(active)}
              >
                <PageIcon className="h-4 w-4 shrink-0" />
              </Link>
            );
          }),
        ];
      })}
    </nav>
    </>
  );
}
