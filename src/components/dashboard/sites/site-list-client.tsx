"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/routes";
import { SiteCardData } from "@/components/site/site-card";
import { CreateSiteModal } from "@/components/site/create-site-modal";
import { EditSiteModal }   from "@/components/site/edit-site-modal";
import { toggleSiteAction, deleteSiteAction } from "@/actions/site/delete";
import { PageHeader }  from "@/components/dashboard/page-header";
import { Button }      from "@/components/ui/button";
import { Input }       from "@/components/ui/input";
import { Badge }       from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, Plus, Search, LayoutGrid, List,
  Users, MoreVertical, Pencil, PowerOff, Power, Trash2,
  Phone, MapPin, FileText, ArrowRight, ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { showToast } from "@/lib/toast";

interface SiteListClientProps {
  sites: SiteCardData[];
}

type ViewMode     = "grid" | "table";
type StatusFilter = "all" | "active" | "inactive";

/* ─── Page-level wrapper — renders PageHeader + list ────────────────────────── */

export function SiteListClientPage({ sites }: SiteListClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Sites"
        description={
          sites.length === 0
            ? "No sites yet — create your first one to get started."
            : `${sites.length} site${sites.length !== 1 ? "s" : ""} in your account`
        }
        action={
          sites.length > 0 ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Site
            </Button>
          ) : undefined
        }
      />

      {sites.length === 0 ? (
        <div className="border-2 border-dashed rounded-2xl p-20 text-center space-y-5">
          <div className="flex justify-center">
            <div className="bg-muted rounded-2xl p-5">
              <Building2 className="h-9 w-9 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">No sites yet</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
              Create your first site to start managing your business locations.
            </p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Site
          </Button>
        </div>
      ) : (
        <SiteListClient
          sites={sites}
          externalCreateOpen={createOpen}
          onExternalCreateOpenChange={setCreateOpen}
          onRefresh={refresh}
        />
      )}

      <CreateSiteModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={refresh}
      />
    </div>
  );
}

/* ─── Core list (toolbar + grid/table) ──────────────────────────────────────── */

interface SiteListClientInternalProps {
  sites: SiteCardData[];
  externalCreateOpen: boolean;
  onExternalCreateOpenChange: (v: boolean) => void;
  onRefresh: () => void;
}

function SiteListClient({
  sites: initialSites,
  onRefresh,
}: SiteListClientInternalProps) {
  const [query,        setQuery]        = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode,     setViewMode]     = useState<ViewMode>("grid");
  const [editSite,     setEditSite]     = useState<SiteCardData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiteCardData | null>(null);
  const [isPending,    setIsPending]    = useState(false);

  const filtered = useMemo(() => {
    let list = initialSites;
    if (statusFilter === "active")   list = list.filter((s) => s.isActive);
    if (statusFilter === "inactive") list = list.filter((s) => !s.isActive);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [initialSites, query, statusFilter]);

  async function handleToggle(site: SiteCardData) {
    setIsPending(true);
    await toggleSiteAction(site.id, !site.isActive);
    showToast.success(site.isActive ? `"${site.name}" deactivated.` : `"${site.name}" activated.`);
    setIsPending(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsPending(true);
    await deleteSiteAction(deleteTarget.id);
    showToast.success(`"${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
    setIsPending(false);
    onRefresh();
  }

  if (initialSites.length === 0) return null;

  return (
    <div className="space-y-5">

      {/* Toolbar — search + filters + view toggle, NO New Site button */}
      <div className="flex items-center gap-3">

        {/* Full-width search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, address, or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11 h-11 text-sm"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 h-11 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === f ? "pill-active" : "pill-inactive"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-xl overflow-hidden shrink-0 h-11">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 h-full transition-colors ${
              viewMode === "grid" ? "view-active" : "view-inactive"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 h-full transition-colors ${
              viewMode === "table" ? "view-active" : "view-inactive"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* No results from filter */}
      {filtered.length === 0 && (
        <div className="border border-border rounded-2xl p-12 text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-muted rounded-xl p-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground">No sites match your filters</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search or status.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setQuery(""); setStatusFilter("all"); }}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((site) => (
            <SiteGridCard
              key={site.id}
              site={site}
              onEdit={setEditSite}
              onToggle={handleToggle}
              onDelete={setDeleteTarget}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && viewMode === "table" && (
        <div className="border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Site</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground hidden md:table-cell">Address</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
                <th className="text-center px-5 py-3.5 font-medium text-muted-foreground">Staff</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
                <th className="text-center px-5 py-3.5 font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((site, i) => (
                <SiteTableRow
                  key={site.id}
                  site={site}
                  isLast={i === filtered.length - 1}
                  onEdit={setEditSite}
                  onToggle={handleToggle}
                  onDelete={setDeleteTarget}
                  isPending={isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      <EditSiteModal
        site={editSite}
        open={!!editSite}
        onOpenChange={(o) => { if (!o) setEditSite(null); }}
        onSuccess={onRefresh}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this site, all staff accounts, permissions, and records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}
              className="bg-destructive hover:bg-destructive/90">
              {isPending ? "Deleting..." : "Yes, Delete Site"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Empty state (shown by page wrapper when no sites) ─────────────────────── */

export function SiteEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="border-2 border-dashed rounded-2xl p-20 text-center space-y-5">
      <div className="flex justify-center">
        <div className="bg-muted rounded-2xl p-5">
          <Building2 className="h-9 w-9 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-foreground text-lg">No sites yet</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
          Create your first site to start managing your business locations.
        </p>
      </div>
      <Button size="lg" onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Create First Site
      </Button>
    </div>
  );
}

/* ─── Grid card ─────────────────────────────────────────────────────────────── */

function SiteGridCard({ site, onEdit, onToggle, onDelete, isPending }: {
  site: SiteCardData;
  onEdit: (s: SiteCardData) => void;
  onToggle: (s: SiteCardData) => void;
  onDelete: (s: SiteCardData) => void;
  isPending: boolean;
}) {
  return (
    <div className={`group relative border rounded-2xl p-5 bg-card transition-all space-y-4
      ${site.isActive ? "hover:border-primary/40 hover:shadow-md" : "opacity-60 border-dashed"}`}>

      <div className="flex items-start justify-between gap-2">
        <Link href={ROUTES.dashboard.site(site.id)} className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`rounded-xl p-2.5 shrink-0 transition-colors
            ${site.isActive ? "bg-primary/10 group-hover:bg-primary/20" : "bg-muted"}`}>
            <Building2 className={`h-5 w-5 ${site.isActive ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{site.name}</h3>
            {!site.isActive && <Badge variant="secondary" className="text-xs mt-0.5">Inactive</Badge>}
          </div>
        </Link>
        <SiteDropdown site={site} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete}
          isPending={isPending} className="opacity-0 group-hover:opacity-100" />
      </div>

      <Link href={ROUTES.dashboard.site(site.id)} className="block space-y-1.5">
        {site.phone    && <p className="flex items-center gap-2 text-xs text-muted-foreground truncate"><Phone   className="h-3 w-3 shrink-0" /> {site.phone}</p>}
        {site.address  && <p className="flex items-center gap-2 text-xs text-muted-foreground truncate"><MapPin  className="h-3 w-3 shrink-0" /> {site.address}</p>}
        {site.taxNumber && <p className="flex items-center gap-2 text-xs text-muted-foreground truncate"><FileText className="h-3 w-3 shrink-0" /> {site.taxNumber}</p>}
        {!site.phone && !site.address && !site.taxNumber && (
          <p className="text-xs text-muted-foreground italic">No details added</p>
        )}
      </Link>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <Link href={ROUTES.dashboard.staffBySite(site.id)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
          <Users className="h-3.5 w-3.5" /> {site._count?.subUserSites ?? 0} staff
        </Link>
        <Link href={ROUTES.dashboard.site(site.id)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
          View <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

/* ─── Table row ─────────────────────────────────────────────────────────────── */

function SiteTableRow({ site, isLast, onEdit, onToggle, onDelete, isPending }: {
  site: SiteCardData;
  isLast: boolean;
  onEdit: (s: SiteCardData) => void;
  onToggle: (s: SiteCardData) => void;
  onDelete: (s: SiteCardData) => void;
  isPending: boolean;
}) {
  return (
    <tr className={`group hover:bg-muted/30 transition-colors ${!isLast ? "border-b border-border" : ""}`}>
      <td className="px-5 py-4">
        <Link href={ROUTES.dashboard.site(site.id)} className="flex items-center gap-3">
          <div className={`rounded-xl p-2 shrink-0 ${site.isActive ? "bg-primary/10" : "bg-muted"}`}>
            <Building2 className={`h-4 w-4 ${site.isActive ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <span className="font-medium text-foreground hover:underline">{site.name}</span>
        </Link>
      </td>
      <td className="px-5 py-4 text-muted-foreground hidden md:table-cell text-sm">
        {site.address ?? <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell text-sm">
        {site.phone ?? <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className="px-5 py-4 text-center">
        <Link href={ROUTES.dashboard.staffBySite(site.id)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <Users className="h-3.5 w-3.5" /> {site._count?.subUserSites ?? 0}
        </Link>
      </td>
      <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell text-xs">
        {formatDate(site.createdAt)}
      </td>
      <td className="px-5 py-4 text-center">
        <Badge variant={site.isActive ? "default" : "secondary"} className="text-xs">
          {site.isActive ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-3 py-4">
        <SiteDropdown site={site} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete}
          isPending={isPending} className="opacity-0 group-hover:opacity-100" />
      </td>
    </tr>
  );
}

/* ─── Shared dropdown ────────────────────────────────────────────────────────── */

function SiteDropdown({ site, onEdit, onToggle, onDelete, isPending, className }: {
  site: SiteCardData;
  onEdit: (s: SiteCardData) => void;
  onToggle: (s: SiteCardData) => void;
  onDelete: (s: SiteCardData) => void;
  isPending: boolean;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"
          className={`h-8 w-8 shrink-0 transition-opacity ${className ?? ""}`}
          disabled={isPending}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={ROUTES.dashboard.site(site.id)}>
            <ExternalLink className="mr-2 h-4 w-4" /> View Site
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(site)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit Details
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.dashboard.staffBySite(site.id)}>
            <Users className="mr-2 h-4 w-4" /> Manage Staff
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onToggle(site)}>
          {site.isActive
            ? <><PowerOff className="mr-2 h-4 w-4" /> Deactivate</>
            : <><Power    className="mr-2 h-4 w-4" /> Activate</>
          }
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(site)}
          className="text-destructive focus:text-destructive focus:bg-destructive/10">
          <Trash2 className="mr-2 h-4 w-4" /> Delete Site
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}