"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast }     from "sonner";
import {
  createSiteCategoryAction,
  updateCategoryAction,
  softDeleteCategoryAction,
  createCategoryTypeAction,
} from "@/actions/portal/category";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  ArrowLeft, Tag, Loader2, Plus, Trash2, ChevronDown, Check, X,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface CategoryType { id: string; name: string }
interface Category {
  id: string; name: string; description: string | null;
  color: string; isActive: boolean; isGlobal: boolean;
  type: CategoryType | null;
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#64748b", "#1e293b", "#0ea5e9",
];

/* ── Type Picker Modal ──────────────────────────────────────── */

function TypePickerModal({
  open, onClose, types, selectedId, onSelect, onCreateType,
}: {
  open:         boolean;
  onClose:      () => void;
  types:        CategoryType[];
  selectedId:   string;
  onSelect:     (id: string) => void;
  onCreateType: (name: string) => Promise<CategoryType | null>;
}) {
  const [newName,    setNewName]    = useState("");
  const [isCreating, startCreating] = useTransition();

  function handleCreate() {
    if (!newName.trim()) return;
    const name = newName.trim();
    startCreating(async () => {
      const created = await onCreateType(name);
      if (created) { onSelect(created.id); setNewName(""); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold">Select type</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 -mr-1">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-60 p-2 space-y-0.5">
          <button onClick={() => { onSelect(""); onClose(); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left ${
              selectedId === "" ? "bg-muted" : "hover:bg-muted/50"
            }`}>
            <span className="text-sm text-muted-foreground">No type</span>
            {selectedId === "" && (
              <div className="w-5 h-5 bg-foreground rounded-full flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-background" />
              </div>
            )}
          </button>
          {types.map((t) => (
            <button key={t.id} onClick={() => { onSelect(t.id); onClose(); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left ${
                selectedId === t.id ? "bg-muted" : "hover:bg-muted/50"
              }`}>
              <span className="text-sm font-medium">{t.name}</span>
              {selectedId === t.id && (
                <div className="w-5 h-5 bg-foreground rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-background" />
                </div>
              )}
            </button>
          ))}
          {types.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No types yet — add one below</p>
          )}
        </div>

        <div className="px-4 pb-4 pt-3 border-t border-border space-y-2">
          <Label className="text-xs text-muted-foreground">Add new type</Label>
          <div className="flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
              placeholder="e.g. Product, Service..." disabled={isCreating}
              className="h-9 text-sm" autoFocus />
            <Button size="sm" onClick={handleCreate}
              disabled={isCreating || !newName.trim()} className="h-9 px-3 shrink-0">
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Form ──────────────────────────────────────────────── */

export function CategoryFormClient({
  siteId, isMaster, categoryTypes: initialTypes,
  editingCategory, backUrl,
}: {
  siteId:          string | null;
  isMaster:        boolean;
  categoryTypes:   CategoryType[];
  editingCategory: Category | null;
  backUrl:         string;
}) {
  const router = useRouter();
  const isEdit = !!editingCategory;

  const [name,        setName]        = useState(editingCategory?.name        ?? "");
  const [description, setDescription] = useState(editingCategory?.description ?? "");
  const [color,       setColor]       = useState(editingCategory?.color       ?? "#6366f1");
  const [typeId,      setTypeId]      = useState(editingCategory?.type?.id    ?? "");
  const [types,       setTypes]       = useState<CategoryType[]>(initialTypes);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [unsavedOpen,   setUnsavedOpen]   = useState(false);
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [isPending,     startTransition]  = useTransition();
  const [isDelPending,  startDelTransition] = useTransition();

  const isDirty = useRef(false);

  useEffect(() => {
    isDirty.current =
      name        !== (editingCategory?.name        ?? "") ||
      description !== (editingCategory?.description ?? "") ||
      color       !== (editingCategory?.color       ?? "#6366f1") ||
      typeId      !== (editingCategory?.type?.id    ?? "");
  }, [name, description, color, typeId, editingCategory]);

  function handleBack() {
    if (isDirty.current && name.trim()) setUnsavedOpen(true);
    else router.push(backUrl);
  }

  async function handleCreateType(typeName: string): Promise<CategoryType | null> {
    const res = await createCategoryTypeAction(typeName);
    if (!res.success) { toast.error(res.error); return null; }
    const newType: CategoryType = { id: res.categoryType.id, name: res.categoryType.name };
    setTypes((prev) => [...prev, newType]);
    toast.success(`Type "${typeName}" created.`);
    return newType;
  }

  function handleSave() {
    if (!name.trim()) { toast.error("Category name is required."); return; }
    const fd = new FormData();
    fd.append("name",        name.trim());
    fd.append("description", description.trim());
    fd.append("color",       color);
    if (typeId) fd.append("typeId", typeId);

    startTransition(async () => {
      const res = isEdit
        ? await updateCategoryAction(editingCategory!.id, editingCategory!.isGlobal ? null : siteId, fd)
        : await createSiteCategoryAction(siteId, fd);

      if (res.success) {
        toast.success(isEdit ? "Category updated." : "Category created.");
        isDirty.current = false;
        router.push(backUrl);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete() {
    if (!editingCategory) return;
    startDelTransition(async () => {
      const res = await softDeleteCategoryAction(
        editingCategory.id, editingCategory.isGlobal ? null : siteId
      );
      if (res.success) {
        toast.success(`"${editingCategory.name}" deleted.`);
        isDirty.current = false;
        router.push(backUrl);
        router.refresh();
      } else {
        toast.error(res.error);
      }
      setDeleteOpen(false);
    });
  }

  const selectedType = types.find((t) => t.id === typeId);

  return (
    <>
      <div className="bg-background">

        {/* Form — centered on page */}
        <main className="max-w-xl mx-auto px-6 py-10 space-y-8">
          {/* Save / back action bar */}
          <div className="flex items-center justify-between">
            <button onClick={handleBack}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              {isEdit ? "Back" : "Cancel"}
            </button>
            <Button onClick={handleSave} disabled={isPending || !name.trim()} size="sm">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>

          <PageHeader title={isEdit ? "Edit Category" : "New Category"} />

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics, Clothing..." autoFocus className="h-11" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What kinds of items belong in this category?" rows={3}
              className="w-full text-sm border border-input rounded-xl px-4 py-3 outline-none
                focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors
                placeholder:text-muted-foreground bg-background resize-none" />
          </div>

          {/* Type */}
          <section className="space-y-3 pt-4 border-t border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Type</h2>
            <button onClick={() => setTypeModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 border border-border
                rounded-xl hover:border-foreground/30 transition-colors text-left h-11">
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className={`text-sm ${selectedType ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {selectedType ? selectedType.name : "Select type"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </section>

          {/* Color */}
          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Color</h2>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: color + "20" }}>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
              </div>
              <div>
                <p className="text-sm font-medium">Preview</p>
                <p className="text-xs text-muted-foreground font-mono">{color}</p>
              </div>
            </div>
          </section>

          {/* Danger zone */}
          {isEdit && (isMaster || !editingCategory?.isGlobal) && (
            <section className="space-y-4 pt-4 border-t border-border">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Danger Zone
              </h2>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-medium">Delete category</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Removes this category. Can be restored later by an administrator.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}
                  disabled={isDelPending}
                  className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Type picker */}
      <TypePickerModal
        open={typeModalOpen} onClose={() => setTypeModalOpen(false)}
        types={types} selectedId={typeId} onSelect={setTypeId}
        onCreateType={handleCreateType}
      />

      {/* Unsaved changes */}
      <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Discard them or keep editing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { isDirty.current = false; router.push(backUrl); }}
              className="bg-destructive hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{editingCategory?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This category will be removed. It can be restored later by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDelPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDelPending}
              className="bg-destructive hover:bg-destructive/90">
              {isDelPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}