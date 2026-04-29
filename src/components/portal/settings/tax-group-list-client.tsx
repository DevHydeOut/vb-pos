"use client";

import { useState, useTransition } from "react";
import { toast }   from "sonner";
import {
  createTaxGroupAction,
  updateTaxGroupAction,
  softDeleteTaxGroupAction,
  pushTaxGroupsToSitesAction,
} from "@/actions/portal/coupon-tax";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Percent, Plus, MoreHorizontal, Trash2, Pencil,
  Upload, Check, Building2, Loader2, Star, ChevronDown,
} from "lucide-react";

/* ── Country presets ────────────────────────────────────────── */

const COUNTRY_PRESETS: Record<string, { name: string; rate: number; description?: string }[]> = {
  "India (GST)": [
    { name: "GST 0%",  rate: 0,  description: "Essential goods" },
    { name: "GST 5%",  rate: 5,  description: "Basic necessities" },
    { name: "GST 12%", rate: 12, description: "Standard goods" },
    { name: "GST 18%", rate: 18, description: "Most goods & services" },
    { name: "GST 28%", rate: 28, description: "Luxury & sin goods" },
  ],
  "UK (VAT)": [
    { name: "VAT 0%",   rate: 0,  description: "Zero-rated goods" },
    { name: "VAT 5%",   rate: 5,  description: "Reduced rate" },
    { name: "VAT 20%",  rate: 20, description: "Standard rate" },
  ],
  "UAE (VAT)": [
    { name: "VAT 0%", rate: 0, description: "Exempt" },
    { name: "VAT 5%", rate: 5, description: "Standard rate" },
  ],
  "Australia (GST)": [
    { name: "GST 0%",  rate: 0,  description: "GST-free" },
    { name: "GST 10%", rate: 10, description: "Standard rate" },
  ],
  "EU (VAT)": [
    { name: "VAT 0%",   rate: 0,  description: "Exempt" },
    { name: "VAT 7%",   rate: 7,  description: "Reduced rate" },
    { name: "VAT 19%",  rate: 19, description: "Standard rate" },
  ],
  "Custom": [],
};

/* ── Types ──────────────────────────────────────────────────── */

interface TaxGroup {
  id:          string;
  name:        string;
  rate:        number;
  description: string | null;
  isDefault:   boolean;
  isActive:    boolean;
  isGlobal:    boolean;
}

interface SiteSimple { id: string; name: string }

/* ── Tax Form Modal ─────────────────────────────────────────── */

function TaxFormModal({ open, onClose, siteId, taxGroup }: {
  open:      boolean;
  onClose:   () => void;
  siteId:    string | null;
  taxGroup:  TaxGroup | null;
}) {
  const isEdit                       = !!taxGroup;
  const [isPending, startTransition] = useTransition();
  const [name,        setName]        = useState(taxGroup?.name        ?? "");
  const [rate,        setRate]        = useState(String(taxGroup?.rate ?? ""));
  const [description, setDescription]= useState(taxGroup?.description ?? "");
  const [isDefault,   setIsDefault]  = useState(taxGroup?.isDefault   ?? false);

  // Reset when modal reopens
  function handleOpen(open: boolean) {
    if (open) {
      setName(taxGroup?.name ?? "");
      setRate(String(taxGroup?.rate ?? ""));
      setDescription(taxGroup?.description ?? "");
      setIsDefault(taxGroup?.isDefault ?? false);
    }
    if (!open && !isPending) onClose();
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name",        name);
      fd.append("rate",        rate);
      fd.append("description", description);
      fd.append("isDefault",   String(isDefault));

      const res = isEdit
        ? await updateTaxGroupAction(taxGroup!.id, siteId, fd)
        : await createTaxGroupAction(siteId, fd);

      if (res.success) {
        toast.success(isEdit ? "Tax group updated." : "Tax group created.");
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <Percent className="h-4 w-4 text-background" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">
                {isEdit ? "Edit Tax Group" : "New Tax Group"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isEdit ? `Editing ${taxGroup!.name}` : "Add a tax rate for this site"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GST 18%" className="h-11" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Rate (%) <span className="text-destructive">*</span></Label>
            <Input type="number" min="0" max="100" step="0.01"
              value={rate} onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 18" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Description
              <span className="text-muted-foreground text-xs font-normal ml-1">optional</span>
            </Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Most goods & services" className="h-11" />
          </div>

          {/* Default toggle */}
          <button onClick={() => setIsDefault((p) => !p)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              isDefault ? "border-foreground bg-muted" : "border-border hover:border-foreground/30"
            }`}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
              isDefault ? "border-foreground bg-foreground" : "border-muted-foreground/40"
            }`}>
              {isDefault && <Check className="h-3 w-3 text-background" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Set as default tax</p>
              <p className="text-xs text-muted-foreground">Applied automatically to new items</p>
            </div>
            {isDefault && <Star className="h-4 w-4 text-foreground ml-auto shrink-0" />}
          </button>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save Changes" : "Create Tax Group"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Push Modal ─────────────────────────────────────────────── */

function PushModal({ open, onClose, taxGroups, allSites }: {
  open:       boolean;
  onClose:    () => void;
  taxGroups:  TaxGroup[];
  allSites:   SiteSimple[];
}) {
  const [selGroups, setSelGroups] = useState<string[]>([]);
  const [selSites,  setSelSites]  = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const toggle = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, id: T) =>
    set((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  function handlePush() {
    if (!selGroups.length) { toast.error("Select at least one tax group."); return; }
    if (!selSites.length)  { toast.error("Select at least one site.");      return; }
    startTransition(async () => {
      const res = await pushTaxGroupsToSitesAction(selGroups, selSites);
      if (res.success) {
        toast.success("Tax groups pushed successfully.");
        setSelGroups([]); setSelSites([]); onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isPending) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <Upload className="h-4 w-4 text-background" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">Push Tax Groups to Sites</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Selected tax groups will be copied to the chosen sites.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 divide-x divide-border max-h-72 overflow-hidden">
          <div className="flex flex-col overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 border-b border-border">TAX GROUPS</p>
            <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
              {taxGroups.map((t) => (
                <button key={t.id} onClick={() => toggle(setSelGroups, t.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    selGroups.includes(t.id) ? "bg-foreground text-background" : "hover:bg-muted"
                  }`}>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{t.name}</p>
                    <p className={`text-xs ${selGroups.includes(t.id) ? "text-background/70" : "text-muted-foreground"}`}>
                      {t.rate}%
                    </p>
                  </div>
                  {selGroups.includes(t.id) && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 border-b border-border">SITES</p>
            <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
              {allSites.map((s) => (
                <button key={s.id} onClick={() => toggle(setSelSites, s.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    selSites.includes(s.id) ? "bg-foreground text-background" : "hover:bg-muted"
                  }`}>
                  <span className="text-xs truncate flex items-center gap-2">
                    <Building2 className="h-3 w-3 shrink-0" /> {s.name}
                  </span>
                  {selSites.includes(s.id) && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <Button onClick={handlePush} disabled={isPending} className="flex-1">
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Push {selGroups.length > 0 ? `${selGroups.length} group${selGroups.length > 1 ? "s" : ""}` : ""}
            {selSites.length > 0 ? ` to ${selSites.length} site${selSites.length > 1 ? "s" : ""}` : ""}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function TaxGroupListClient({ taxGroups, allSites, siteId, isMaster }: {
  taxGroups: TaxGroup[];
  allSites:  SiteSimple[];
  siteId:    string | null;
  isMaster:  boolean;
}) {
  const [formOpen,   setFormOpen]   = useState(false);
  const [editing,    setEditing]    = useState<TaxGroup | null>(null);
  const [pushOpen,   setPushOpen]   = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [selPreset,  setSelPreset]  = useState<string>("India (GST)");
  const [isPending,  startTransition] = useTransition();

  function handleEdit(t: TaxGroup) { setEditing(t); setFormOpen(true); }
  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await softDeleteTaxGroupAction(deleteId, siteId);
      if (res.success) { toast.success("Tax group deleted."); setDeleteId(null); }
      else toast.error(res.error);
    });
  }

  async function applyPreset(country: string) {
    const presets = COUNTRY_PRESETS[country] ?? [];
    if (!presets.length) { setPresetOpen(false); return; }
    startTransition(async () => {
      for (const preset of presets) {
        const fd = new FormData();
        fd.append("name",        preset.name);
        fd.append("rate",        String(preset.rate));
        fd.append("description", preset.description ?? "");
        fd.append("isDefault",   "false");
        await createTaxGroupAction(siteId, fd);
      }
      toast.success(`${country} tax rates added.`);
      setPresetOpen(false);
    });
  }

  return (
    <div className="space-y-6">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1" />

        {/* Country preset picker */}
        <DropdownMenu open={presetOpen} onOpenChange={setPresetOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isPending}>
              <span>Add from preset</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
            {Object.keys(COUNTRY_PRESETS).filter((k) => k !== "Custom").map((country) => (
              <DropdownMenuItem key={country} onClick={() => applyPreset(country)}
                className="rounded-xl cursor-pointer">
                {country}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {isMaster && allSites.length > 0 && (
          <Button variant="outline" onClick={() => setPushOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Push to Sites
          </Button>
        )}
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Tax Rate
        </Button>
      </div>

      {/* ── Empty state ──────────────────────────────────────── */}
      {taxGroups.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-2xl p-20 text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-muted rounded-2xl p-5">
              <Percent className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">No tax rates yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add manually or use a country preset to get started quickly.
            </p>
          </div>
        </div>
      )}

      {/* ── Tax group list ───────────────────────────────────── */}
      {taxGroups.length > 0 && (
        <div className="space-y-2">
          {taxGroups.map((t) => (
            <div key={t.id}
              className="group flex items-center gap-4 px-5 py-4 bg-card border border-border
                rounded-2xl hover:border-foreground/20 transition-all">

              {/* Rate badge */}
              <div className="w-14 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-background">{t.rate}%</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{t.name}</span>
                  {t.isDefault && (
                    <span className="inline-flex items-center gap-1 text-xs bg-foreground text-background px-2 py-0.5 rounded-lg">
                      <Star className="h-3 w-3" /> Default
                    </span>
                  )}
                  {t.isGlobal && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">
                      Global
                    </span>
                  )}
                  {!t.isActive && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">
                      Inactive
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5">
                  <DropdownMenuItem onClick={() => handleEdit(t)} className="rounded-xl gap-3 cursor-pointer">
                    <Pencil className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteId(t.id)}
                    className="rounded-xl gap-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <TaxFormModal
        open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }}
        siteId={siteId} taxGroup={editing}
      />
      <PushModal
        open={pushOpen} onClose={() => setPushOpen(false)}
        taxGroups={taxGroups} allSites={allSites}
      />
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tax group?</AlertDialogTitle>
            <AlertDialogDescription>
              This tax rate will be removed. Any items using it won't be affected retroactively.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}