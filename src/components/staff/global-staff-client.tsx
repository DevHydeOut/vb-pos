"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter }    from "next/navigation";
import { toast }        from "sonner";
import Link             from "next/link";
import { ROUTES }       from "@/routes";

import { createSubUserAction } from "@/actions/site/create-sub-user";

import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }   from "@/components/ui/label";
import { Badge }   from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Search, Users, User, ArrowRight,
  Loader2, LayoutGrid, List, Building2,
  AlertCircle, Info,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface SiteSimple { id: string; name: string }
interface PermRow    { module: { id: string } | null; page: { id: string } | null }
interface SiteAssign { siteId: string; site: SiteSimple; permissions: PermRow[] }
interface SubUser {
  id: string; name: string | null; username: string; description: string | null;
  isActive: boolean; createdAt: Date; sites: SiteAssign[];
}

type StatusFilter = "all" | "active" | "inactive";
type ViewMode     = "grid" | "list";

/* ── Create Modal ───────────────────────────────────────────── */

function CreateStaffModal({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createSubUserAction(formData);
      if (res.success) {
        toast.success(`"${res.username}" created! Set up their permissions now.`);
        onSuccess(res.subUserId);
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-7 pt-7 pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-background" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Add Staff Member</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Enter basic details. Assign site access and permissions next.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form action={handleSubmit} className="px-7 py-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" name="name" placeholder="e.g. John Doe"
              disabled={isPending} autoFocus className="h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Username <span className="text-destructive">*</span>
            </Label>
            <Input id="username" name="username" placeholder="e.g. cashier"
              disabled={isPending} className="h-11"
              onChange={(e) => (e.target.value = e.target.value.toLowerCase())} />
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and underscores only.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-muted-foreground text-xs font-normal">optional</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="e.g. Morning shift cashier, handles billing and stock entry"
              disabled={isPending}
              className="min-h-20 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input id="password" name="password" type="password"
              placeholder="Min. 6 characters" disabled={isPending} className="h-11" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create & Set Up Permissions"}
            </Button>
            <Button type="button" variant="outline" disabled={isPending}
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Export ────────────────────────────────────────────── */

export function GlobalStaffClient({ subUsers, allSites, accountId }: {
  subUsers:  SubUser[];
  allSites:  SiteSimple[];
  accountId: string;
}) {
  const router = useRouter();
  const [createOpen,    setCreateOpen]    = useState(false);
  const [query,         setQuery]         = useState("");
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("all");
  const [siteFilter,    setSiteFilter]    = useState("all");
  const [viewMode,      setViewMode]      = useState<ViewMode>("list");

  const filtered = useMemo(() => {
    let list = subUsers;

    // Status
    if (statusFilter === "active")   list = list.filter((u) => u.isActive);
    if (statusFilter === "inactive") list = list.filter((u) => !u.isActive);

    // Site
    if (siteFilter !== "all")
      list = list.filter((u) => u.sites.some((s) => s.siteId === siteFilter));

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q)
      );
    }

    return list;
  }, [subUsers, statusFilter, siteFilter, query]);

  function handleCreated(subUserId: string) {
    router.push(ROUTES.dashboard.staffDetail(subUserId));
  }

  if (subUsers.length === 0) {
    return (
      <>
        <div className="border-2 border-dashed rounded-2xl p-20 text-center space-y-5">
          <div className="flex justify-center">
            <div className="bg-muted rounded-2xl p-5">
              <Users className="h-9 w-9 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">No staff members yet</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
              Add your first staff member to start managing access across your sites.
            </p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add First Staff Member
          </Button>
        </div>

        <CreateStaffModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={handleCreated}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="space-y-3">

        {/* Row 1: Search + view toggle + add button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-11 h-11 text-sm"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-xl overflow-hidden shrink-0 h-11">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 h-full transition-colors ${
                viewMode === "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 h-full transition-colors ${
                viewMode === "grid"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Add Staff
          </Button>
        </div>

        {/* Row 2: Filter chips — scrollable */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {/* Status */}
          {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 h-9 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === f
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          {/* Divider */}
          {allSites.length > 0 && (
            <div className="w-px h-5 bg-border shrink-0 mx-1" />
          )}

          {/* Site chips */}
          {allSites.length > 0 && (
            <>
              <button
                onClick={() => setSiteFilter("all")}
                className={`px-3.5 h-9 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  siteFilter === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                All Sites
              </button>
              {allSites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setSiteFilter(site.id)}
                  className={`px-3.5 h-9 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    siteFilter === site.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {site.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Account ID badge */}
      <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-4 py-2.5 w-fit">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Account ID: <span className="font-mono font-semibold text-foreground">{accountId}</span>
        </p>
      </div>

      {/* ── No results ──────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="border border-border rounded-2xl p-12 text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-muted rounded-xl p-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground">No staff match your filters</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search, status, or site.</p>
          </div>
          <Button variant="outline" size="sm"
            onClick={() => { setQuery(""); setStatusFilter("all"); setSiteFilter("all"); }}>
            Clear filters
          </Button>
        </div>
      )}

      {/* ── List view ───────────────────────────────────────── */}
      {filtered.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {filtered.map((staff) => (
            <StaffListRow key={staff.id} staff={staff} />
          ))}
        </div>
      )}

      {/* ── Grid view ───────────────────────────────────────── */}
      {filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((staff) => (
            <StaffGridCard key={staff.id} staff={staff} />
          ))}
        </div>
      )}

      <CreateStaffModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreated}
      />
    </div>
  );
}

/* ── Staff List Row ─────────────────────────────────────────── */

function StaffListRow({ staff }: { staff: SubUser }) {
  const totalSites   = staff.sites.length;
  const totalModules = staff.sites.reduce(
    (acc, s) => acc + s.permissions.filter((p) => p.module && !p.page).length, 0
  );
  const hasNoPerms = totalSites === 0;

  return (
    <Link
      href={ROUTES.dashboard.staffDetail(staff.id)}
      className="group flex items-center gap-4 px-5 py-4 bg-card border border-border rounded-2xl
        hover:border-foreground/20 hover:bg-muted/30 transition-all"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-background">
          {(staff.name ?? staff.username).charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Name + username */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-foreground truncate">
            {staff.name ?? staff.username}
          </p>
          {!staff.isActive && (
            <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>
          )}
          {hasNoPerms && (
            <Badge variant="outline" className="text-xs shrink-0 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">
              No permissions
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">@{staff.username}</p>
        {staff.description && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{staff.description}</p>
        )}
      </div>

      {/* Site pills */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end max-w-xs">
        {staff.sites.map((s) => (
          <span key={s.siteId}
            className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-lg">
            <Building2 className="h-3 w-3" /> {s.site.name}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" /> {totalSites} site{totalSites !== 1 ? "s" : ""}
        </span>
        {totalModules > 0 && (
          <span className="flex items-center gap-1">
            <LayoutGrid className="h-3.5 w-3.5" /> {totalModules} module{totalModules !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

/* ── Staff Grid Card ────────────────────────────────────────── */

function StaffGridCard({ staff }: { staff: SubUser }) {
  const totalSites   = staff.sites.length;
  const totalModules = staff.sites.reduce(
    (acc, s) => acc + s.permissions.filter((p) => p.module && !p.page).length, 0
  );
  const hasNoPerms = totalSites === 0;

  return (
    <Link
      href={ROUTES.dashboard.staffDetail(staff.id)}
      className="group flex flex-col gap-4 p-5 bg-card border border-border rounded-2xl
        hover:border-foreground/20 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center shrink-0">
          <span className="text-base font-bold text-background">
            {(staff.name ?? staff.username).charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {!staff.isActive && (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}
          {hasNoPerms && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3 w-3" /> No perms
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <p className="font-semibold text-foreground">{staff.name ?? staff.username}</p>
        <p className="text-xs text-muted-foreground">@{staff.username}</p>
        {staff.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{staff.description}</p>
        )}
      </div>

      {/* Sites */}
      {totalSites > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {staff.sites.map((s) => (
            <span key={s.siteId}
              className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-lg">
              <Building2 className="h-3 w-3" /> {s.site.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No sites assigned</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{totalSites} site{totalSites !== 1 ? "s" : ""}</span>
          {totalModules > 0 && <span>·</span>}
          {totalModules > 0 && <span>{totalModules} module{totalModules !== 1 ? "s" : ""}</span>}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
