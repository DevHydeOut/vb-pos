"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/routes";
import { updateSiteAction }                  from "@/actions/site/update";
import { toggleSiteAction, deleteSiteAction } from "@/actions/site/delete";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, Users, Pencil, Check, X,
  Phone, ArrowRight,
  Power, PowerOff, Trash2, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";

interface Module {
  id:        string;
  key:       string;
  label:     string;
  sortOrder: number;
  pages:     { id: string; key: string; label: string }[];
}

interface StaffMember {
  id:       string;
  name:     string | null;
  username: string;
}

interface Site {
  id:        string;
  name:      string;
  address:   string | null;
  phone:     string | null;
  taxNumber: string | null;
  isActive:  boolean;
}

interface SiteDetailClientProps {
  site:        Site;
  staffCount:  number;
  recentStaff: StaffMember[];
  modules:     Module[];
  siteId:      string;
}

export function SiteDetailClient({
  site: initialSite,
  staffCount,
  recentStaff,
  modules,
  siteId,
}: SiteDetailClientProps) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

      {/* ── LEFT COLUMN (3/5) ─────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-10">

        {/* Site Information — no card box */}
        <SiteInfoSection site={initialSite} siteId={siteId} onRefresh={refresh} />

        {/* Recent Staff */}
        {recentStaff.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Recent Staff
              </h2>
              <Link
                href={ROUTES.dashboard.staffBySite(siteId)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-0.5">
              {recentStaff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-background">
                      {(member.name ?? member.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.name ?? member.username}
                    </p>
                    <p className="text-xs text-muted-foreground">@{member.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Danger Zone — no outer border */}
        <DangerZone site={initialSite} siteId={siteId} onRefresh={refresh} />
      </div>

      {/* ── RIGHT COLUMN (2/5) ────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-8">

        {/* Quick stats */}
        <section className="space-y-2.5">
          <Link
            href={ROUTES.dashboard.staffBySite(siteId)}
            className="group flex items-center justify-between px-5 py-4 rounded-2xl border border-border
              hover:border-foreground/20 hover:bg-muted/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="bg-muted rounded-xl p-2.5">
                <Users className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{staffCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Staff Members</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>

          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border">
            <div className="bg-muted rounded-xl p-2.5">
              <LayoutGrid className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{modules.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Modules Active</p>
            </div>
          </div>
        </section>

        {/* Modules — 2-column small cards */}
        {modules.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Modules
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {modules.map((mod) => (
                <Link
                  key={mod.id}
                  href={ROUTES.staff.module(siteId, mod.key)}
                  className="group flex flex-col gap-3 p-4 rounded-2xl border border-border
                    hover:border-foreground/25 hover:bg-muted/40 transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-background" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{mod.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {mod.pages.map((p) => p.label).join(" · ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

/* ─── Site Info Section ──────────────────────────────────────────────────────── */

function SiteInfoSection({
  site, siteId, onRefresh,
}: {
  site: Site;
  siteId: string;
  onRefresh: () => void;
}) {
  const [editing,   setEditing]      = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name,      setName]         = useState(site.name);
  const [phone,     setPhone]        = useState(site.phone ?? "");
  const [address,   setAddress]      = useState(site.address ?? "");
  const [taxNumber, setTaxNumber]    = useState(site.taxNumber ?? "");
  const [error,     setError]        = useState("");

  function handleCancel() {
    setName(site.name);
    setPhone(site.phone ?? "");
    setAddress(site.address ?? "");
    setTaxNumber(site.taxNumber ?? "");
    setError("");
    setEditing(false);
  }

  function handleSave() {
    if (!name.trim()) { setError("Site name is required."); return; }
    setError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("siteId",    siteId);
      fd.set("name",      name.trim());
      fd.set("phone",     phone.trim());
      fd.set("address",   address.trim());
      fd.set("taxNumber", taxNumber.trim());
      const result = await updateSiteAction(fd);
      if (!result.success) {
        setError(result.error);
      } else {
        toast.success("Site updated.");
        setEditing(false);
        onRefresh();
      }
    });
  }

  // Shared input style — muted when read-only, normal when editing
  const inputCls = `h-11 transition-colors ${
    !editing
      ? "bg-muted/40 border-transparent text-foreground cursor-default focus-visible:ring-0 focus-visible:ring-offset-0"
      : ""
  }`;
  const textareaCls = `resize-none transition-colors ${
    !editing
      ? "bg-muted/40 border-transparent text-foreground cursor-default focus-visible:ring-0 focus-visible:ring-offset-0"
      : ""
  }`;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Site Information
        </h2>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5">
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}
              className="h-7 px-2.5 text-xs text-muted-foreground gap-1">
              <X className="h-3 w-3" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}
              className="h-7 px-3 text-xs gap-1">
              <Check className="h-3 w-3" />
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Always show input layout — read-only when not editing */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name" className="text-sm font-medium">
            Site Name <span className="text-destructive">*</span>
          </Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="My Site Name" readOnly={!editing} disabled={isPending}
            className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-phone" className="text-sm font-medium">Phone</Label>
            <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Not provided" readOnly={!editing} disabled={isPending}
              className={inputCls} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tax" className="text-sm font-medium">Tax / GST Number</Label>
            <Input id="edit-tax" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="Not provided" readOnly={!editing} disabled={isPending}
              className={inputCls} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-address" className="text-sm font-medium">Address</Label>
          <Textarea id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="Not provided" rows={3} readOnly={!editing} disabled={isPending}
            className={textareaCls} />
        </div>
      </div>
    </section>
  );
}

/* ─── Danger Zone ────────────────────────────────────────────────────────────── */

function DangerZone({ site, siteId, onRefresh }: {
  site: Site;
  siteId: string;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete,     setShowDelete]     = useState(false);
  const [isPending,      startTransition]   = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleSiteAction(siteId, !site.isActive);
      toast.success(site.isActive ? `"${site.name}" deactivated.` : `"${site.name}" activated.`);
      setShowDeactivate(false);
      onRefresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSiteAction(siteId);
      toast.success(`"${site.name}" deleted.`);
      setShowDelete(false);
      router.push(ROUTES.dashboard.sites);
    });
  }

  return (
    <section className="space-y-5">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Danger Zone
      </h2>

      {/* Deactivate row */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-foreground">
            {site.isActive ? "Deactivate site" : "Activate site"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {site.isActive
              ? "Staff will lose access. Can be reactivated at any time."
              : "Staff will regain access to this site."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowDeactivate(true)}
          className={`shrink-0 mt-0.5 ${
            site.isActive
              ? "border-orange-300 text-warning hover:bg-warning-muted dark:border-orange-800 dark:text-warning dark:hover:bg-warning-muted"
              : "border-green-300 text-success hover:bg-success-muted dark:border-green-800 dark:text-success dark:hover:bg-success-muted"
          }`}
        >
          {site.isActive
            ? <><PowerOff className="h-3.5 w-3.5 mr-1.5" /> Deactivate</>
            : <><Power    className="h-3.5 w-3.5 mr-1.5" /> Activate</>
          }
        </Button>
      </div>

      {/* Delete row */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-foreground">Delete this site</p>
          <p className="text-xs text-muted-foreground mt-1">
            Permanently removes all staff, permissions, and records. Cannot be undone.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowDelete(true)}
          className="shrink-0 mt-0.5 border-destructive/40 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20">
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
        </Button>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {site.isActive ? "Deactivate" : "Activate"} &quot;{site.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {site.isActive
                ? "Staff will immediately lose access to this site."
                : "Staff will regain access to this site."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle} disabled={isPending}>
              {isPending ? "Saving..." : site.isActive ? "Yes, Deactivate" : "Yes, Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{site.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this site, all staff accounts, permissions, and records.
              This cannot be undone.
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
    </section>
  );
}