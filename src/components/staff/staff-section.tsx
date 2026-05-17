"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { createSubUserAction }     from "@/actions/site/create-sub-user";
import { toast }                   from "sonner";
import { Button }                  from "@/components/ui/button";
import { Input }                   from "@/components/ui/input";
import { Textarea }                from "@/components/ui/textarea";
import { Label }                   from "@/components/ui/label";
import { Badge }                   from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch }    from "@/components/ui/switch";
import { Loader2, Plus, User, ChevronDown, ChevronRight, Info } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface Page     { id: string; key: string; label: string }
interface Module   { id: string; key: string; label: string; pages: Page[] }
interface Site     { id: string; name: string }
interface SubUser  { id: string; name: string | null; username: string; description?: string | null }
interface Permission { module: { id: string; label: string } | null; page: { id: string; label: string } | null }
interface SubUserSite {
  subUser:     SubUser;
  siteId:      string;
  permissions: Permission[];
}

interface StaffSectionProps {
  siteId:       string;
  subUserSites: SubUserSite[];
  modules:      Module[];
  allSites:     Site[];
  accountId:    string;
}

// ── Permission Picker ─────────────────────────────────────────
function PermissionPicker({
  siteId,
  siteName,
  modules,
  selected,
  onChange,
}: {
  siteId:   string;
  siteName: string;
  modules:  Module[];
  selected: { moduleIds: string[]; pageIds: string[] };
  onChange: (val: { moduleIds: string[]; pageIds: string[] }) => void;
}) {
  const [openModules, setOpenModules] = useState<string[]>([]);

  function toggleModule(moduleId: string, checked: boolean) {
    if (checked) {
      // Grant full module — remove any page-level for this module
      const module    = modules.find((m) => m.id === moduleId)!;
      const pageIds   = selected.pageIds.filter(
        (pid) => !module.pages.some((p) => p.id === pid)
      );
      onChange({ moduleIds: [...selected.moduleIds, moduleId], pageIds });
    } else {
      // Remove module and all its pages
      const module  = modules.find((m) => m.id === moduleId)!;
      onChange({
        moduleIds: selected.moduleIds.filter((id) => id !== moduleId),
        pageIds:   selected.pageIds.filter((pid) => !module.pages.some((p) => p.id === pid)),
      });
    }
  }

  function togglePage(moduleId: string, pageId: string, checked: boolean) {
    // If toggling a page, auto-remove module-level grant for this module
    const newModuleIds = selected.moduleIds.filter((id) => id !== moduleId);
    if (checked) {
      onChange({ moduleIds: newModuleIds, pageIds: [...selected.pageIds, pageId] });
    } else {
      onChange({ moduleIds: newModuleIds, pageIds: selected.pageIds.filter((id) => id !== pageId) });
    }
  }

  function toggleOpenModule(moduleId: string) {
    setOpenModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  }

  return (
    <div className="space-y-2">
      {modules.map((mod) => {
        const moduleGranted = selected.moduleIds.includes(mod.id);
        const isOpen        = openModules.includes(mod.id);
        const grantedPages  = selected.pageIds.filter(
          (pid) => mod.pages.some((p) => p.id === pid)
        );

        return (
          <div key={mod.id} className="border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50">
              <div className="flex items-center gap-2">
                {/* Expand arrow — only if module has pages */}
                {mod.pages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleOpenModule(mod.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isOpen
                      ? <ChevronDown  className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />
                    }
                  </button>
                )}
                <span className="text-sm font-medium text-gray-800">{mod.label}</span>
                {moduleGranted && (
                  <Badge variant="secondary" className="text-xs">Full access</Badge>
                )}
                {!moduleGranted && grantedPages.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {grantedPages.length} page{grantedPages.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <Switch
                checked={moduleGranted}
                onCheckedChange={(checked) => toggleModule(mod.id, checked)}
              />
            </div>

            {/* Pages — show when expanded and not full module access */}
            {isOpen && !moduleGranted && mod.pages.length > 0 && (
              <div className="divide-y">
                {mod.pages.map((page) => (
                  <div key={page.id} className="flex items-center justify-between px-4 py-2.5 bg-white">
                    <span className="text-sm text-gray-600 pl-4">{page.label}</span>
                    <Switch
                      checked={selected.pageIds.includes(page.id)}
                      onCheckedChange={(checked) => togglePage(mod.id, page.id, checked)}
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

// ── Create Staff Modal ────────────────────────────────────────
function CreateStaffModal({
  open,
  onOpenChange,
  modules,
  allSites,
  currentSiteId,
  onSuccess,
}: {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  modules:       Module[];
  allSites:      Site[];
  currentSiteId: string;
  onSuccess:     () => void;
}) {
  const [isPending, startTransition] = useTransition();

  // Permissions per site — starts with current site selected
  const [sitePerms, setSitePerms] = useState<
    Record<string, { enabled: boolean; moduleIds: string[]; pageIds: string[] }>
  >(() =>
    Object.fromEntries(
      allSites.map((s) => [
        s.id,
        { enabled: s.id === currentSiteId, moduleIds: [], pageIds: [] },
      ])
    )
  );

  function handleSubmit(formData: FormData) {
    // Build permissions array from state
    const permissions = allSites
      .filter((s) => sitePerms[s.id]?.enabled)
      .map((s) => ({
        siteId:    s.id,
        moduleIds: sitePerms[s.id].moduleIds,
        pageIds:   sitePerms[s.id].pageIds,
      }))
      .filter((p) => p.moduleIds.length > 0 || p.pageIds.length > 0);

    if (permissions.length === 0) {
      toast.error("Assign at least one module or page permission");
      return;
    }

    formData.append("permissions", JSON.stringify(permissions));

    startTransition(async () => {
      const res = await createSubUserAction(formData);
      if (res.success) {
        toast.success(`Staff member "${res.username}" created!`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Staff Member</DialogTitle>
          <DialogDescription>
            Add a new staff member and assign their site access and permissions.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Account Details
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
              <Input id="name" name="name" placeholder="e.g. John Doe" disabled={isPending} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                name="username"
                placeholder="e.g. cashier"
                disabled={isPending}
                className="lowercase"
                onChange={(e) => (e.target.value = e.target.value.toLowerCase())}
              />
              <p className="text-xs text-gray-400">
                Lowercase letters, numbers and underscores only
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 6 characters"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description <span className="text-muted-foreground text-xs font-normal">optional</span></Label>
              <Textarea
                id="description"
                name="description"
                placeholder="e.g. Evening cashier, stock entry support"
                disabled={isPending}
                className="min-h-20 resize-none"
              />
            </div>
          </div>

          {/* Site access + permissions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Site Access & Permissions
            </h3>

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Toggle a module ON to grant full access to all its pages. Expand a module to grant access to specific pages only.
              </p>
            </div>

            {allSites.map((site) => (
              <div key={site.id} className="border rounded-xl overflow-hidden">
                {/* Site toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-900">
                  <span className="text-sm font-semibold text-white">{site.name}</span>
                  <Switch
                    checked={sitePerms[site.id]?.enabled ?? false}
                    onCheckedChange={(checked) =>
                      setSitePerms((prev) => ({
                        ...prev,
                        [site.id]: { ...prev[site.id], enabled: checked },
                      }))
                    }
                  />
                </div>

                {/* Module/page permissions — only shown if site is enabled */}
                {sitePerms[site.id]?.enabled && (
                  <div className="p-3 space-y-2 bg-gray-50">
                    <PermissionPicker
                      siteId={site.id}
                      siteName={site.name}
                      modules={modules}
                      selected={{
                        moduleIds: sitePerms[site.id].moduleIds,
                        pageIds:   sitePerms[site.id].pageIds,
                      }}
                      onChange={(val) =>
                        setSitePerms((prev) => ({
                          ...prev,
                          [site.id]: { ...prev[site.id], ...val },
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Staff Member"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Staff Section (main export) ───────────────────────────────
export function StaffSection({
  siteId,
  subUserSites,
  modules,
  allSites,
  accountId,
}: StaffSectionProps) {
  const router         = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-50 border rounded-xl px-4 py-2">
          <Info className="h-4 w-4 text-gray-400" />
          <p className="text-sm text-gray-600">
            Staff login using Account ID:{" "}
            <span className="font-mono font-semibold text-gray-900">{accountId}</span>
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Staff list */}
      {subUserSites.length === 0 ? (
        <div className="border-2 border-dashed rounded-2xl p-12 text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-gray-100 rounded-full p-4">
              <User className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <p className="font-medium text-gray-700">No staff members yet</p>
          <p className="text-sm text-gray-500">
            Add your first staff member to get started.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Staff Member
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {subUserSites.map(({ subUser, permissions }) => {
            const moduleCount = permissions.filter((p) => p.module && !p.page).length;
            const pageCount   = permissions.filter((p) => p.page).length;

            return (
              <div
                key={subUser.id}
                className="bg-white border rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="bg-slate-100 rounded-xl p-2.5">
                  <User className="h-5 w-5 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">
                    {subUser.name ?? subUser.username}
                  </p>
                  <p className="text-xs text-gray-500">@{subUser.username}</p>
                </div>
                <div className="flex gap-2">
                  {moduleCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {moduleCount} module{moduleCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {pageCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {pageCount} page{pageCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateStaffModal
        open={open}
        onOpenChange={setOpen}
        modules={modules}
        allSites={allSites}
        currentSiteId={siteId}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
