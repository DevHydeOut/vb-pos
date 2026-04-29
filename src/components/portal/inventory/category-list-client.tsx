"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter }  from "next/navigation";
import Link           from "next/link";
import { toast }      from "sonner";
import {
  softDeleteCategoryAction,
  pushCategoriesToSitesAction,
} from "@/actions/portal/category";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
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
import { PageHeader } from "@/components/shared/page-header";
import {
  Tag, Plus, Search, MoreHorizontal, Trash2,
  Pencil, ArrowLeft, Upload, Check, Building2, Loader2,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface CategoryType { id: string; name: string }
interface SiteSimple   { id: string; name: string }
interface Category {
  id: string; name: string; description: string | null;
  color: string; isActive: boolean; isGlobal: boolean;
  type: CategoryType | null; deletedAt: Date | null;
}

/* ── Push to Sites Modal ────────────────────────────────────── */

function PushModal({ open, onClose, categories, allSites, onSuccess }: {
  open:       boolean;
  onClose:    () => void;
  categories: Category[];
  allSites:   SiteSimple[];
  onSuccess:  () => void;
}) {
  const [selectedCats,  setSelectedCats]  = useState<string[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [isPending, startTransition]      = useTransition();

  const toggle = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, id: T) =>
    set((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  function handlePush() {
    if (!selectedCats.length)  { toast.error("Select at least one category."); return; }
    if (!selectedSites.length) { toast.error("Select at least one site."); return; }
    startTransition(async () => {
      const res = await pushCategoriesToSitesAction(selectedCats, selectedSites);
      if (res.success) {
        toast.success(`Pushed ${selectedCats.length} categor${selectedCats.length > 1 ? "ies" : "y"} to ${selectedSites.length} site${selectedSites.length > 1 ? "s" : ""}.`);
        setSelectedCats([]); setSelectedSites([]);
        onSuccess(); onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] p-0 overflow-hidden">

        <DialogHeader className="px-7 pt-7 pb-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-background" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Push to sites</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Copy selected categories to other sites. Duplicates are skipped.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-6">
          {/* Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Categories</p>
              <button onClick={() => setSelectedCats(selectedCats.length === categories.length ? [] : categories.map((c) => c.id))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {selectedCats.length === categories.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="space-y-1.5">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => toggle(setSelectedCats, cat.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    selectedCats.includes(cat.id) ? "border-foreground bg-muted/40" : "border-border hover:border-foreground/30"
                  }`}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + "25" }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  </div>
                  <span className="text-sm font-medium flex-1">{cat.name}</span>
                  {selectedCats.includes(cat.id) && (
                    <div className="w-5 h-5 bg-foreground rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-background" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sites */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sites</p>
              <button onClick={() => setSelectedSites(selectedSites.length === allSites.length ? [] : allSites.map((s) => s.id))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {selectedSites.length === allSites.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="space-y-1.5">
              {allSites.map((site) => (
                <button key={site.id} onClick={() => toggle(setSelectedSites, site.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    selectedSites.includes(site.id) ? "border-foreground bg-muted/40" : "border-border hover:border-foreground/30"
                  }`}>
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium flex-1">{site.name}</span>
                  {selectedSites.includes(site.id) && (
                    <div className="w-5 h-5 bg-foreground rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-background" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-7 py-5 border-t border-border shrink-0 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isPending}>Cancel</Button>
          <Button onClick={handlePush} disabled={isPending} className="flex-1">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Push
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main ───────────────────────────────────────────────────── */

export function CategoryListClient({
  siteId, siteName, isMaster, categories, allSites,
}: {
  siteId:     string | null;
  siteName:   string;
  isMaster:   boolean;
  categories: Category[];
  allSites?:  SiteSimple[];
}) {
  const router = useRouter();
  const [query,        setQuery]        = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [pushOpen,     setPushOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isPending,    startTransition] = useTransition();

  const filtered = useMemo(() => {
    let list = categories;
    if (typeFilter !== "all") list = list.filter((c) => c.type?.id === typeFilter);
    if (query.trim()) list = list.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [categories, query, typeFilter]);

  const presentTypes = useMemo(() => {
    const seen = new Map<string, string>();
    categories.forEach((c) => { if (c.type) seen.set(c.type.id, c.type.name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [categories]);

  function handleDelete(cat: Category) {
    startTransition(async () => {
      const res = await softDeleteCategoryAction(cat.id, cat.isGlobal ? null : siteId);
      if (res.success) { toast.success(`"${cat.name}" deleted.`); router.refresh(); }
      else toast.error(res.error);
      setDeleteTarget(null);
    });
  }

  return (
    <>
      <div className="bg-background">
        {/* Action bar */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between gap-3">
          <PageHeader title="Categories" description="Manage product categories" /><div className="flex items-center gap-2">
            {isMaster && allSites && allSites.length > 0 && categories.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPushOpen(true)}>
                <Upload className="h-3.5 w-3.5" /> Push to sites
              </Button>
            )}
            <Button asChild size="sm">
              <Link href={siteId ? `/portal/${siteId}/inventory/categories/new` : `/dashboard/manage/categories/new`}>
                <Plus className="h-4 w-4" /> New Category
              </Link>
            </Button>
          </div>
        </div>

        <main className="px-6 py-4 space-y-5">

          {/* Toolbar */}
          {categories.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input placeholder="Search categories..." value={query}
                  onChange={(e) => setQuery(e.target.value)} className="pl-11 h-11 text-sm" />
              </div>
              {presentTypes.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {["all", ...presentTypes.map((t) => t.id)].map((id) => {
                    const label = id === "all" ? "All" : presentTypes.find((t) => t.id === id)!.name;
                    return (
                      <button key={id} onClick={() => setTypeFilter(id)}
                        className={`px-3.5 h-11 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                          typeFilter === id
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {categories.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-2xl p-20 text-center space-y-5">
              <div className="flex justify-center">
                <div className="bg-muted rounded-2xl p-5">
                  <Tag className="h-9 w-9 text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-lg">No categories yet</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
                  Categories help you organise your items and make them easier to find.
                </p>
              </div>
              <Button size="lg" asChild>
                <Link href={siteId ? `/portal/${siteId}/inventory/categories/new` : `/dashboard/manage/categories/new`}>
                  <Plus className="h-4 w-4" /> Create Category
                </Link>
              </Button>
            </div>
          )}

          {/* No results */}
          {categories.length > 0 && filtered.length === 0 && (
            <div className="border border-border rounded-2xl p-12 text-center space-y-3">
              <div className="flex justify-center">
                <div className="bg-muted rounded-xl p-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="font-medium">No categories match</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search or type.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setQuery(""); setTypeFilter("all"); }}>
                Clear filters
              </Button>
            </div>
          )}

          {/* List */}
          {filtered.length > 0 && (
            <div className="border border-border rounded-2xl overflow-hidden">
              {filtered.map((cat, i) => (
                <div key={cat.id}
                  className={`group flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors ${
                    i < filtered.length - 1 ? "border-b border-border" : ""
                  }`}>

                  {/* Color dot */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cat.color + "20" }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  </div>

                  {/* Name + meta */}
                  <Link href={siteId ? `/portal/${siteId}/inventory/categories/${cat.id}` : `/dashboard/manage/categories/${cat.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{cat.name}</p>
                      {cat.isGlobal && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg shrink-0">Global</span>
                      )}
                      {!cat.isActive && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg shrink-0">Inactive</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.type?.name ?? "No type"}</p>
                  </Link>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={siteId ? `/portal/${siteId}/inventory/categories/${cat.id}` : `/dashboard/manage/categories/${cat.id}`}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      {(isMaster || !cat.isGlobal) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteTarget(cat)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {filtered.length} categor{filtered.length !== 1 ? "ies" : "y"}
            </p>
          )}
        </main>
      </div>

      {/* Push modal */}
      {isMaster && (
        <PushModal open={pushOpen} onClose={() => setPushOpen(false)}
          categories={categories} allSites={allSites ?? []}
          onSuccess={() => router.refresh()} />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This category will be removed. It can be restored later by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}