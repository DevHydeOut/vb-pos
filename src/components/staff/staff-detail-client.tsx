"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { toast }                   from "sonner";
import {
  updateSubUserAction,
  resetSubUserPasswordAction,
  toggleSubUserAction,
  updateSubUserPermissionsAction,
  deleteSubUserAction,
} from "@/actions/staff/manage";
import { ROUTES }  from "@/routes";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }   from "@/components/ui/label";
import { Badge }   from "@/components/ui/badge";
import { Switch }  from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Save, KeyRound, Power, PowerOff, Trash2,
  ChevronDown, ChevronRight, Building2, LayoutGrid,
  AlertCircle, Check, X,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────── */

interface Page       { id: string; key: string; label: string }
interface Module     { id: string; key: string; label: string; pages: Page[] }
interface Site       { id: string; name: string }
interface PermRow    { module: { id: string; label: string } | null; page: { id: string; label: string } | null }
interface SiteAssign { siteId: string; site: Site; permissions: PermRow[] }
interface SubUser    {
  id: string; name: string | null; description: string | null; username: string;
  isActive: boolean; sites: SiteAssign[];
}

/* ── Permission Picker ──────────────────────────────────────────────── */

function PermissionPicker({ modules, selected, onChange }: {
  modules:  Module[];
  selected: { moduleIds: string[]; pageIds: string[] };
  onChange: (val: { moduleIds: string[]; pageIds: string[] }) => void;
}) {
  const [openMods, setOpenMods] = useState<string[]>([]);

  function toggleModule(moduleId: string, checked: boolean) {
    const mod = modules.find((m) => m.id === moduleId)!;
    if (checked) {
      const pageIds = selected.pageIds.filter((pid) => !mod.pages.some((p) => p.id === pid));
      onChange({ moduleIds: [...selected.moduleIds, moduleId], pageIds });
    } else {
      onChange({
        moduleIds: selected.moduleIds.filter((id) => id !== moduleId),
        pageIds:   selected.pageIds.filter((pid) => !mod.pages.some((p) => p.id === pid)),
      });
    }
  }

  function togglePage(moduleId: string, pageId: string, checked: boolean) {
    onChange({
      moduleIds: selected.moduleIds.filter((id) => id !== moduleId),
      pageIds:   checked
        ? [...selected.pageIds, pageId]
        : selected.pageIds.filter((id) => id !== pageId),
    });
  }

  if (modules.length === 0) {
    return <p className="text-sm text-muted-foreground py-3">No modules available.</p>;
  }

  return (
    <div className="space-y-2">
      {modules.map((mod) => {
        const granted      = selected.moduleIds.includes(mod.id);
        const isOpen       = openMods.includes(mod.id);
        const grantedPages = selected.pageIds.filter((pid) => mod.pages.some((p) => p.id === pid));

        return (
          <div key={mod.id} className="border border-border rounded-xl overflow-hidden">
            {/* Module row */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/40">
              {mod.pages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenMods((p) =>
                    p.includes(mod.id) ? p.filter((x) => x !== mod.id) : [...p, mod.id]
                  )}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {isOpen
                    ? <ChevronDown  className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />
                  }
                </button>
              )}
              <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center shrink-0">
                <LayoutGrid className="h-3.5 w-3.5 text-background" />
              </div>
              <span className="text-sm font-medium flex-1">{mod.label}</span>
              {granted && (
                <Badge variant="secondary" className="text-xs">Full access</Badge>
              )}
              {!granted && grantedPages.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {grantedPages.length} page{grantedPages.length > 1 ? "s" : ""}
                </Badge>
              )}
              <Switch checked={granted} onCheckedChange={(c) => toggleModule(mod.id, c)} />
            </div>

            {/* Page rows */}
            {isOpen && !granted && mod.pages.length > 0 && (
              <div className="divide-y divide-border">
                {mod.pages.map((page) => (
                  <div key={page.id}
                    className="flex items-center justify-between px-4 py-2.5 pl-14 bg-background">
                    <span className="text-sm text-muted-foreground">{page.label}</span>
                    <Switch
                      checked={selected.pageIds.includes(page.id)}
                      onCheckedChange={(c) => togglePage(mod.id, page.id, c)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */

export function StaffDetailClient({ subUser, allSites, modules }: {
  subUser:  SubUser;
  allSites: Site[];
  modules:  Module[];
}) {
  const router = useRouter();
  const [isPending,   startTransition] = useTransition();
  const [showDelete,  setShowDelete]   = useState(false);

  // Track unsaved changes in basic details
  const [nameVal,     setNameVal]      = useState(subUser.name ?? "");
  const [descriptionVal, setDescriptionVal] = useState(subUser.description ?? "");
  const [usernameVal, setUsernameVal]  = useState(subUser.username);
  const [newPassword, setNewPassword]  = useState("");

  // Site permissions state
  const [sitePerms, setSitePerms] = useState<
    Record<string, { enabled: boolean; moduleIds: string[]; pageIds: string[] }>
  >(() =>
    Object.fromEntries(
      allSites.map((s) => {
        const assignment = subUser.sites.find((a) => a.siteId === s.id);
        if (!assignment) return [s.id, { enabled: false, moduleIds: [], pageIds: [] }];
        return [s.id, {
          enabled:   true,
          moduleIds: assignment.permissions.filter((p) => p.module && !p.page).map((p) => p.module!.id),
          pageIds:   assignment.permissions.filter((p) => p.page).map((p) => p.page!.id),
        }];
      })
    )
  );

  /* ── Handlers ──────────────────────────────────────────────── */

  function handleUpdateDetails() {
    const fd = new FormData();
    fd.append("subUserId", subUser.id);
    fd.append("name",      nameVal.trim());
    fd.append("description", descriptionVal.trim());
    fd.append("username",  usernameVal.trim());
    startTransition(async () => {
      const res = await updateSubUserAction(fd);
      if (res.success) { toast.success("Details updated."); router.refresh(); }
      else toast.error(res.error);
    });
  }

  function handleResetPassword() {
    if (!newPassword.trim()) { toast.error("Enter a new password."); return; }
    const fd = new FormData();
    fd.append("subUserId",   subUser.id);
    fd.append("newPassword", newPassword.trim());
    startTransition(async () => {
      const res = await resetSubUserPasswordAction(fd);
      if (res.success) {
        toast.success("Password reset. Staff member will need to log in again.");
        setNewPassword("");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleSubUserAction(subUser.id, !subUser.isActive);
      if (res.success) {
        toast.success(subUser.isActive ? "Staff member deactivated." : "Staff member activated.");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function handleSavePermissions() {
    const permissions = allSites
      .filter((s) => sitePerms[s.id]?.enabled)
      .map((s) => ({
        siteId:    s.id,
        moduleIds: sitePerms[s.id].moduleIds,
        pageIds:   sitePerms[s.id].pageIds,
      }))
      .filter((p) => p.moduleIds.length > 0 || p.pageIds.length > 0);

    if (permissions.length === 0) {
      toast.error("Assign at least one permission before saving.");
      return;
    }
    startTransition(async () => {
      const res = await updateSubUserPermissionsAction(subUser.id, permissions);
      if (res.success) { toast.success("Permissions saved."); router.refresh(); }
      else toast.error(res.error);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteSubUserAction(subUser.id);
      if (res.success) {
        toast.success(`"${subUser.username}" deleted.`);
        router.push(ROUTES.dashboard.staff);
      } else toast.error(res.error);
    });
  }

  /* ── Layout ────────────────────────────────────────────────── */

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

      {/* ── LEFT COL (3/5): details + security + danger ──────── */}
      <div className="lg:col-span-3 space-y-10">

        {/* Inactive banner */}
        {!subUser.isActive && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-3.5">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This staff member is <strong>inactive</strong> and cannot log in.
            </p>
          </div>
        )}

        {/* Basic Details */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Basic Details
            </h2>
            <Button size="sm" onClick={handleUpdateDetails} disabled={isPending}
              className="h-7 px-3 text-xs gap-1">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Save
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <Input id="name" value={nameVal} onChange={(e) => setNameVal(e.target.value)}
                placeholder="e.g. John Doe" disabled={isPending} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input id="username" value={usernameVal}
                onChange={(e) => setUsernameVal(e.target.value.toLowerCase())}
                placeholder="e.g. cashier" disabled={isPending} className="h-11" />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and underscores only.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-muted-foreground text-xs font-normal">optional</span>
              </Label>
              <Textarea
                id="description"
                value={descriptionVal}
                onChange={(e) => setDescriptionVal(e.target.value)}
                placeholder="Role notes or shift details"
                disabled={isPending}
                className="min-h-24 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Reset Password */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Reset Password
            </h2>
            <Button size="sm" variant="outline" onClick={handleResetPassword} disabled={isPending}
              className="h-7 px-3 text-xs gap-1">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
              Reset
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
            <Input id="newPassword" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters" disabled={isPending} className="h-11" />
            <p className="text-xs text-muted-foreground">
              Staff member will be signed out immediately after reset.
            </p>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Danger Zone
          </h2>

          {/* Activate / Deactivate */}
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-foreground">
                {subUser.isActive ? "Deactivate account" : "Activate account"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {subUser.isActive
                  ? "Staff member will lose access immediately. Can be reactivated."
                  : "Staff member will regain login access."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleToggle} disabled={isPending}
              className={`shrink-0 mt-0.5 ${
                subUser.isActive
                  ? "border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
                  : "border-green-300 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
              }`}
            >
              {subUser.isActive
                ? <><PowerOff className="h-3.5 w-3.5 mr-1.5" /> Deactivate</>
                : <><Power    className="h-3.5 w-3.5 mr-1.5" /> Activate</>
              }
            </Button>
          </div>

          {/* Delete */}
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-foreground">Delete this staff member</p>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently removes their account and all site access. Cannot be undone.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} disabled={isPending}
              className="shrink-0 mt-0.5 border-destructive/40 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          </div>
        </section>
      </div>

      {/* ── RIGHT COL (2/5): stats + site permissions ────────── */}
      <div className="lg:col-span-2 space-y-8">

        {/* Stats */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border">
            <div className="bg-muted rounded-xl p-2.5">
              <Building2 className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{subUser.sites.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Sites Assigned</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border">
            <div className="bg-muted rounded-xl p-2.5">
              <LayoutGrid className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">
                {subUser.sites.reduce(
                  (acc, s) => acc + s.permissions.filter((p) => p.module && !p.page).length, 0
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Modules Granted</p>
            </div>
          </div>
        </section>

        {/* Site Access & Permissions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Site Access & Permissions
            </h2>
            <Button size="sm" onClick={handleSavePermissions} disabled={isPending}
              className="h-7 px-3 text-xs gap-1">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Enable a site to assign access. Toggle a module for full access, or expand to pick individual pages.
          </p>

          {allSites.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No sites available.</p>
          ) : (
            <div className="space-y-3">
              {allSites.map((site) => (
                <div key={site.id} className="border border-border rounded-2xl overflow-hidden">
                  {/* Site header */}
                  <div className={`flex items-center justify-between px-4 py-3 transition-colors ${
                    sitePerms[site.id]?.enabled ? "bg-foreground" : "bg-muted/40"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        sitePerms[site.id]?.enabled ? "bg-background/20" : "bg-muted"
                      }`}>
                        <Building2 className={`h-3.5 w-3.5 ${
                          sitePerms[site.id]?.enabled ? "text-background" : "text-muted-foreground"
                        }`} />
                      </div>
                      <span className={`text-sm font-semibold ${
                        sitePerms[site.id]?.enabled ? "text-background" : "text-foreground"
                      }`}>
                        {site.name}
                      </span>
                    </div>
                    <Switch
                      checked={sitePerms[site.id]?.enabled ?? false}
                      onCheckedChange={(c) =>
                        setSitePerms((p) => ({ ...p, [site.id]: { ...p[site.id], enabled: c } }))
                      }
                    />
                  </div>

                  {/* Permissions */}
                  {sitePerms[site.id]?.enabled && (
                    <div className="p-3">
                      <PermissionPicker
                        modules={modules}
                        selected={{
                          moduleIds: sitePerms[site.id].moduleIds,
                          pageIds:   sitePerms[site.id].pageIds,
                        }}
                        onChange={(val) =>
                          setSitePerms((p) => ({ ...p, [site.id]: { ...p[site.id], ...val } }))
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete @{subUser.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes their account and removes all site access. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}
              className="bg-destructive hover:bg-destructive/90">
              {isPending ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
