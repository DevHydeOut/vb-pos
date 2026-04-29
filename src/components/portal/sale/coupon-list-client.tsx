"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter }  from "next/navigation";
import Link           from "next/link";
import { toast }      from "sonner";
import {
  softDeleteCouponAction,
  pushCouponsToSitesAction,
} from "@/actions/portal/coupon-tax";
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
import {
  Tag, Plus, Search, MoreHorizontal, Trash2, Pencil,
  Upload, Check, Building2, Loader2, Ticket, BadgePercent,
  BadgeDollarSign, Clock, AlertCircle, ShieldCheck,
} from "lucide-react";
import { ROUTES } from "@/routes";
import { EmptyState } from "@/components/shared/empty-state";

/* ── Types ──────────────────────────────────────────────────── */

type DiscountType  = "PERCENTAGE" | "FIXED";
type ApplyOn       = "SUBTOTAL_TAX_RECALC" | "SUBTOTAL_TAX_FIXED" | "TOTAL";

interface Coupon {
  id:            string;
  code:          string;
  description:   string | null;
  discountType:  DiscountType;
  discountValue: number;
  capAmount:     number | null;
  applyOn:       ApplyOn;
  minOrderValue: number | null;
  expiresAt:     Date | null;
  isActive:      boolean;
  isGlobal:      boolean;
}

interface SiteSimple { id: string; name: string }

/* ── Helpers ────────────────────────────────────────────────── */

function formatDiscount(c: Coupon) {
  const base = c.discountType === "PERCENTAGE"
    ? `${c.discountValue}% off`
    : `₹${c.discountValue} off`;
  return c.capAmount ? `${base} (max ₹${c.capAmount})` : base;
}

const APPLY_ON_LABELS: Record<ApplyOn, string> = {
  SUBTOTAL_TAX_RECALC: "Subtotal · tax recalculates",
  SUBTOTAL_TAX_FIXED:  "Subtotal · tax fixed",
  TOTAL:               "Total (incl. tax)",
};

function isExpired(c: Coupon) {
  return c.expiresAt ? new Date(c.expiresAt) < new Date() : false;
}

/* ── Push to Sites Modal ────────────────────────────────────── */

function PushModal({ open, onClose, coupons, allSites }: {
  open:     boolean;
  onClose:  () => void;
  coupons:  Coupon[];
  allSites: SiteSimple[];
}) {
  const [selCoupons, setSelCoupons] = useState<string[]>([]);
  const [selSites,   setSelSites]   = useState<string[]>([]);
  const [isPending,  startTransition] = useTransition();

  const toggle = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, id: T) =>
    set((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  function handlePush() {
    if (!selCoupons.length) { toast.error("Select at least one coupon."); return; }
    if (!selSites.length)   { toast.error("Select at least one site.");   return; }
    startTransition(async () => {
      const res = await pushCouponsToSitesAction(selCoupons, selSites);
      if (res.success) {
        toast.success("Coupons pushed successfully.");
        setSelCoupons([]); setSelSites([]); onClose();
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
              <DialogTitle className="text-sm font-semibold">Push Coupons to Sites</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Selected coupons will be copied to the chosen sites.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 divide-x divide-border max-h-72 overflow-hidden">
          {/* Coupons */}
          <div className="flex flex-col overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 border-b border-border">
              COUPONS
            </p>
            <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
              {coupons.map((c) => (
                <button key={c.id} onClick={() => toggle(setSelCoupons, c.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    selCoupons.includes(c.id) ? "bg-foreground text-background" : "hover:bg-muted"
                  }`}>
                  <span className="text-xs font-mono font-semibold truncate">{c.code}</span>
                  {selCoupons.includes(c.id) && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Sites */}
          <div className="flex flex-col overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 border-b border-border">
              SITES
            </p>
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
            Push {selCoupons.length > 0 ? `${selCoupons.length} coupon${selCoupons.length > 1 ? "s" : ""}` : ""}
            {selSites.length > 0 ? ` to ${selSites.length} site${selSites.length > 1 ? "s" : ""}` : ""}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function CouponListClient({ coupons, allSites, siteId, isMaster }: {
  coupons:  Coupon[];
  allSites: SiteSimple[];
  siteId:   string | null;
  isMaster: boolean;
}) {
  const router                       = useRouter();
  const [query,      setQuery]       = useState("");
  const [filter,     setFilter]      = useState<"all" | "active" | "inactive" | "expired">("all");
  const [pushOpen,   setPushOpen]    = useState(false);
  const [deleteId,   setDeleteId]    = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  const filtered = useMemo(() => {
    let list = coupons;
    if (filter === "active")   list = list.filter((c) => c.isActive && !isExpired(c));
    if (filter === "inactive") list = list.filter((c) => !c.isActive);
    if (filter === "expired")  list = list.filter((c) => isExpired(c));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        c.code.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [coupons, filter, query]);

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await softDeleteCouponAction(deleteId, siteId);
      if (res.success) { toast.success("Coupon deleted."); setDeleteId(null); }
      else toast.error(res.error);
    });
  }

  if (coupons.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="No coupons yet"
        description="Create your first discount coupon to reward customers."
        action={<Button onClick={() => router.push(siteId ? `/portal/${siteId}/sale/coupons/new` : `/dashboard/manage/coupons/new`)}><Plus className="h-4 w-4" /> Create Coupon</Button>}
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search coupons..." value={query}
            onChange={(e) => setQuery(e.target.value)} className="pl-11 h-11" />
        </div>
        {isMaster && allSites.length > 0 && (
          <Button variant="outline" onClick={() => setPushOpen(true)} className="shrink-0">
            <Upload className="h-4 w-4 mr-2" /> Push to Sites
          </Button>
        )}
        <Button onClick={() => router.push(siteId ? `/portal/${siteId}/sale/coupons/new` : `/dashboard/manage/coupons/new`)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> New Coupon
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5">
        {(["all", "active", "inactive", "expired"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 h-9 rounded-xl text-sm font-medium transition-colors capitalize ${
              filter === f
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* ── Empty filtered state ─────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="border border-border rounded-2xl p-12 text-center space-y-3">
          <Search className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No coupons match your filters.</p>
          <Button variant="outline" size="sm" onClick={() => { setQuery(""); setFilter("all"); }}>
            Clear filters
          </Button>
        </div>
      )}

      {/* ── Coupon list ──────────────────────────────────────── */}
      <div className="space-y-2">
        {filtered.map((coupon) => {
          const expired = isExpired(coupon);
          const Icon    = coupon.discountType === "PERCENTAGE" ? BadgePercent : BadgeDollarSign;

          return (
            <div key={coupon.id}
              className="group flex items-center gap-4 px-5 py-4 bg-card border border-border
                rounded-2xl hover:border-foreground/20 transition-all">

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                expired || !coupon.isActive ? "bg-muted" : "bg-foreground"
              }`}>
                <Icon className={`h-5 w-5 ${expired || !coupon.isActive ? "text-muted-foreground" : "text-background"}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-foreground tracking-wider">
                    {coupon.code}
                  </span>
                  {coupon.isGlobal && (
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-lg text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" /> Global
                    </span>
                  )}
                  {expired && (
                    <span className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-lg">
                      <Clock className="h-3 w-3" /> Expired
                    </span>
                  )}
                  {!coupon.isActive && !expired && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{formatDiscount(coupon)}</span>
                  <span>·</span>
                  <span>{APPLY_ON_LABELS[coupon.applyOn]}</span>
                  {coupon.minOrderValue && (
                    <><span>·</span><span>Min ₹{coupon.minOrderValue}</span></>
                  )}
                  {coupon.expiresAt && !expired && (
                    <><span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires {new Date(coupon.expiresAt).toLocaleDateString()}
                    </span></>
                  )}
                </div>
                {coupon.description && (
                  <p className="text-xs text-muted-foreground truncate">{coupon.description}</p>
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
                  <DropdownMenuItem asChild className="rounded-xl gap-3 cursor-pointer">
                    <Link href={siteId ? `/portal/${siteId}/sale/coupons/${coupon.id}` : `/dashboard/manage/coupons/${coupon.id}`}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteId(coupon.id)}
                    className="rounded-xl gap-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {/* Push modal */}
      <PushModal
        open={pushOpen} onClose={() => setPushOpen(false)}
        coupons={coupons} allSites={allSites}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This coupon will be removed. This action cannot be undone.
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