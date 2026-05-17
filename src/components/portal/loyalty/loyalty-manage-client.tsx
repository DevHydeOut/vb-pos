"use client";

// src/components/dashboard/loyalty/loyalty-manage-client.tsx

import { useState, useTransition } from "react";
import { toast }                   from "sonner";
import {
  Plus, Pencil, Trash2, Star, Gift, Percent,
  Package, FileText, X, Loader2, Check,
  Zap, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  createRewardAction, updateRewardAction, deleteRewardAction,
  createEarnRuleAction, updateEarnRuleAction, deleteEarnRuleAction,
} from "@/actions/portal/loyalty";
import { Modal } from "@/components/shared/modal";
import { showToast } from "@/lib/toast";
import { ListItemSkeleton } from "@/components/shared/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

/* ── Types ───────────────────────────────────────────────────── */

type RewardType = "FREE_PRODUCT" | "FIXED_DISCOUNT" | "PERCENT_DISCOUNT" | "CUSTOM_VOUCHER";

interface Reward {
  id:              string;
  name:            string;
  description:     string | null;
  type:            RewardType;
  pointsCost:      number;
  discountValue:   number | null;
  productId:       string | null;
  productName:     string | null;
  voucherNote:     string | null;
  isActive:        boolean;
  isGlobal:        boolean;
  siteId:          string | null;
  maxRedemptions:  number | null;
  redemptionCount: number;
  expiresAt:       Date | null;
}

interface EarnRule {
  id:           string;
  name:         string;
  description:  string | null;
  productId:    string | null;
  productName:  string | null;
  categoryId:   string | null;
  categoryName: string | null;
  bonusType:    "MULTIPLIER" | "FLAT";
  bonusValue:   number;
  isActive:     boolean;
  siteId:       string | null;
}

interface Props {
  rewards:        Reward[];
  earnRules:      EarnRule[];
  products:       { id: string; name: string; sellingPrice: number | null }[];
  categories:     { id: string; name: string }[];
  sites:          { id: string; name: string }[];
  pointsName:     string;
  currencySymbol: string;
}

/* ── Reward type config ──────────────────────────────────────── */

const REWARD_TYPES: { type: RewardType; label: string; icon: React.ComponentType<{className?:string}>; desc: string }[] = [
  { type: "FREE_PRODUCT",     label: "Free Product",       icon: Package,  desc: "Give a specific product for free"          },
  { type: "FIXED_DISCOUNT",   label: "Fixed Discount",     icon: Gift,     desc: "Deduct a fixed amount before tax"          },
  { type: "PERCENT_DISCOUNT", label: "Percentage Off",     icon: Percent,  desc: "Apply percentage off before tax"          },
  { type: "CUSTOM_VOUCHER",   label: "Custom Voucher",     icon: FileText, desc: "Staff handles the reward manually"         },
];

/* ── Reward Modal ────────────────────────────────────────────── */

function RewardModal({
  reward, products, sites, pointsName, currencySymbol, onClose, onSaved,
}: {
  reward?:        Reward;
  products:       Props["products"];
  sites:          Props["sites"];
  pointsName:     string;
  currencySymbol: string;
  onClose:        () => void;
  onSaved:        (r: Reward) => void;
}) {
  const isEdit = !!reward;
  const [isPending, start] = useTransition();

  const [name,           setName]           = useState(reward?.name           ?? "");
  const [description,    setDescription]    = useState(reward?.description    ?? "");
  const [type,           setType]           = useState<RewardType>(reward?.type ?? "FIXED_DISCOUNT");
  const [pointsCost,     setPointsCost]     = useState(String(reward?.pointsCost     ?? ""));
  const [discountValue,  setDiscountValue]  = useState(String(reward?.discountValue  ?? ""));
  const [productId,      setProductId]      = useState(reward?.productId      ?? "");
  const [voucherNote,    setVoucherNote]    = useState(reward?.voucherNote    ?? "");
  const [isGlobal,       setIsGlobal]       = useState(reward?.isGlobal       ?? true);
  const [siteId,         setSiteId]         = useState(reward?.siteId         ?? "");
  const [maxRedemptions, setMaxRedemptions] = useState(String(reward?.maxRedemptions ?? ""));
  const [expiresAt,      setExpiresAt]      = useState(
    reward?.expiresAt ? new Date(reward.expiresAt).toISOString().split("T")[0] : ""
  );

  function handleSave() {
    if (!name.trim())   { showToast.error("Name is required");   return; }
    if (!pointsCost)    { showToast.error("Points cost is required"); return; }
    start(async () => {
      const fd = new FormData();
      fd.append("name",           name.trim());
      fd.append("description",    description.trim());
      fd.append("type",           type);
      fd.append("pointsCost",     pointsCost);
      fd.append("discountValue",  discountValue);
      fd.append("productId",      productId);
      fd.append("voucherNote",    voucherNote.trim());
      fd.append("isGlobal",       String(isGlobal));
      fd.append("siteId",         siteId);
      fd.append("maxRedemptions", maxRedemptions);
      fd.append("expiresAt",      expiresAt);

      if (isEdit) {
        const res = await updateRewardAction(reward.id, fd);
        if (res.success) {
          showToast.success("Reward updated.");
          onSaved({ ...reward, name: name.trim(), description, type, pointsCost: parseInt(pointsCost),
            discountValue: parseFloat(discountValue) || null, productId: productId || null,
            productName: products.find(p => p.id === productId)?.name ?? null,
            voucherNote: voucherNote || null, isGlobal, siteId: isGlobal ? null : siteId || null,
            maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null });
          onClose();
        } else showToast.error(res.error);
      } else {
        const res = await createRewardAction(fd);
        if (res.success) {
          showToast.success("Reward created.");
          onSaved({ id: res.id, name: name.trim(), description, type,
            pointsCost: parseInt(pointsCost), discountValue: parseFloat(discountValue) || null,
            productId: productId || null, productName: products.find(p => p.id === productId)?.name ?? null,
            voucherNote: voucherNote || null, isActive: true, isGlobal,
            siteId: isGlobal ? null : siteId || null,
            maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
            redemptionCount: 0, expiresAt: expiresAt ? new Date(expiresAt) : null });
          onClose();
        } else showToast.error(res.error);
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit Reward" : "New Reward"} size="lg"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={isPending} className="flex-1">
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save Changes" : "Create Reward"}
          </Button>
        </div>
      }>
      <div className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label>Reward Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Free Coffee, Rs.100 Off" className="h-10" autoFocus />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description <span className="text-muted-foreground text-xs font-normal">optional</span></Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description for customers" className="h-10" />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Reward Type <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {isPending && Array.from({length: 3}).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
        {!isPending && REWARD_TYPES.map(({ type: t, label, icon: Icon, desc }) => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all
                    ${type === t ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30"}`}>
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Type-specific fields */}
          {type === "FREE_PRODUCT" && (
            <div className="space-y-2">
              <Label>Product <span className="text-destructive">*</span></Label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm
                  focus:outline-none focus:ring-2 focus:ring-foreground/20">
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {(type === "FIXED_DISCOUNT" || type === "PERCENT_DISCOUNT") && (
            <div className="space-y-2">
              <Label>
                {type === "FIXED_DISCOUNT" ? `Amount (${currencySymbol})` : "Percentage (%)"}
                <span className="text-destructive"> *</span>
              </Label>
              <Input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                type="number" min="0.01" step={type === "FIXED_DISCOUNT" ? "0.01" : "1"}
                placeholder={type === "FIXED_DISCOUNT" ? "10.00" : "15"} className="h-10" />
            </div>
          )}
          {type === "CUSTOM_VOUCHER" && (
            <div className="space-y-2">
              <Label>Staff Instructions <span className="text-destructive">*</span></Label>
              <textarea value={voucherNote} onChange={(e) => setVoucherNote(e.target.value)}
                placeholder="What should staff do when this reward is redeemed?"
                className="w-full min-h-20 px-3 py-2.5 border border-border rounded-xl bg-background
                  text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20" />
            </div>
          )}

          {/* Points cost */}
          <div className="space-y-2">
            <Label>{pointsName} Required <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Star className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-warning" />
              <Input value={pointsCost} onChange={(e) => setPointsCost(e.target.value)}
                type="number" min="1" step="1" className="h-10 pl-10"
                placeholder="e.g. 500" />
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <Label>Availability</Label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {([
                { val: true,  label: "All Sites" },
                { val: false, label: "Specific Site" },
              ] as const).map(({ val, label }) => (
                <button key={String(val)} onClick={() => setIsGlobal(val)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors
                    ${isGlobal === val ? "tab-active" : "tab-inactive"}`}>
                  {label}
                </button>
              ))}
            </div>
            {!isGlobal && (
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm
                  focus:outline-none focus:ring-2 focus:ring-foreground/20">
                <option value="">Select site...</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>

          {/* Optional limits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Max Redemptions <span className="text-muted-foreground text-xs font-normal">optional</span></Label>
              <Input value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)}
                type="number" min="1" step="1" className="h-10" placeholder="Unlimited" />
            </div>
            <div className="space-y-2">
              <Label>Expires On <span className="text-muted-foreground text-xs font-normal">optional</span></Label>
              <Input value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                type="date" className="h-10" />
            </div>
          </div>
      </div>
    </Modal>
  );
}

/* ── Earn Rule Modal ─────────────────────────────────────────── */

function EarnRuleModal({
  rule, products, categories, sites, pointsName, onClose, onSaved,
}: {
  rule?:       EarnRule;
  products:    Props["products"];
  categories:  Props["categories"];
  sites:       Props["sites"];
  pointsName:  string;
  onClose:     () => void;
  onSaved:     (r: EarnRule) => void;
}) {
  const isEdit = !!rule;
  const [isPending, start] = useTransition();

  const [name,        setName]        = useState(rule?.name        ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [targetType,  setTargetType]  = useState<"product" | "category">(
    rule?.categoryId ? "category" : "product"
  );
  const [productId,   setProductId]   = useState(rule?.productId   ?? "");
  const [categoryId,  setCategoryId]  = useState(rule?.categoryId  ?? "");
  const [bonusType,   setBonusType]   = useState<"MULTIPLIER" | "FLAT">(rule?.bonusType ?? "MULTIPLIER");
  const [bonusValue,  setBonusValue]  = useState(String(rule?.bonusValue ?? "2"));
  const [siteId,      setSiteId]      = useState(rule?.siteId      ?? "");

  function handleSave() {
    if (!name.trim()) { showToast.error("Name is required"); return; }
    if (targetType === "product"  && !productId)  { showToast.error("Select a product");  return; }
    if (targetType === "category" && !categoryId) { showToast.error("Select a category"); return; }
    start(async () => {
      const fd = new FormData();
      fd.append("name",        name.trim());
      fd.append("description", description.trim());
      fd.append("productId",   targetType === "product"  ? productId  : "");
      fd.append("categoryId",  targetType === "category" ? categoryId : "");
      fd.append("bonusType",   bonusType);
      fd.append("bonusValue",  bonusValue);
      fd.append("siteId",      siteId);

      if (isEdit) {
        const res = await updateEarnRuleAction(rule.id, fd);
        if (res.success) {
          showToast.success("Earn rule updated.");
          onSaved({ ...rule, name: name.trim(), description,
            productId:  targetType === "product"  ? productId  : null,
            productName: targetType === "product"  ? products.find(p => p.id === productId)?.name ?? null : null,
            categoryId: targetType === "category" ? categoryId : null,
            categoryName: targetType === "category" ? categories.find(c => c.id === categoryId)?.name ?? null : null,
            bonusType, bonusValue: parseFloat(bonusValue), siteId: siteId || null });
          onClose();
        } else showToast.error(res.error);
      } else {
        const res = await createEarnRuleAction(fd);
        if (res.success) {
          showToast.success("Earn rule created.");
          onSaved({ id: res.id, name: name.trim(), description,
            productId:  targetType === "product"  ? productId  : null,
            productName: targetType === "product"  ? products.find(p => p.id === productId)?.name ?? null : null,
            categoryId: targetType === "category" ? categoryId : null,
            categoryName: targetType === "category" ? categories.find(c => c.id === categoryId)?.name ?? null : null,
            bonusType, bonusValue: parseFloat(bonusValue), isActive: true, siteId: siteId || null });
          onClose();
        } else showToast.error(res.error);
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit Earn Rule" : "New Earn Rule"} size="md"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={isPending} className="flex-1">
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save Changes" : "Create Rule"}
          </Button>
        </div>
      }>
      <div className="space-y-5">
          <div className="space-y-2">
            <Label>Rule Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics Double Points" className="h-10" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Description <span className="text-muted-foreground text-xs font-normal">optional</span></Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What triggers this bonus?" className="h-10" />
          </div>

          {/* Target: product or category */}
          <div className="space-y-3">
            <Label>Applies To <span className="text-destructive">*</span></Label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {([
                { val: "product" as const,  label: "Product",  icon: Package },
                { val: "category" as const, label: "Category", icon: Tag },
              ]).map(({ val, label, icon: Icon }) => (
                <button key={val} onClick={() => setTargetType(val)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm
                    font-medium transition-colors
                    ${targetType === val ? "tab-active" : "tab-inactive"}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            {targetType === "product" ? (
              <select value={productId} onChange={(e) => setProductId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm
                  focus:outline-none focus:ring-2 focus:ring-foreground/20">
                <option value="">Select a product...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm
                  focus:outline-none focus:ring-2 focus:ring-foreground/20">
                <option value="">Select a category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          {/* Bonus type */}
          <div className="space-y-3">
            <Label>Bonus Type <span className="text-destructive">*</span></Label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {([
                { val: "MULTIPLIER" as const, label: "Multiplier", desc: "e.g. 2× points" },
                { val: "FLAT"       as const, label: "Flat Bonus",  desc: "e.g. +50 points" },
              ]).map(({ val, label, desc }) => (
                <button key={val} onClick={() => setBonusType(val)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors
                    ${bonusType === val ? "tab-active" : "tab-inactive"}`}>
                  {label}
                  <span className={`block text-xs font-normal mt-0.5
                    ${bonusType === val ? "text-background/70" : "text-muted-foreground"}`}>
                    {desc}
                  </span>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                {bonusType === "MULTIPLIER" ? "Multiplier (e.g. 2 = double points)" : `Flat ${pointsName} bonus`}
              </Label>
              <Input value={bonusValue} onChange={(e) => setBonusValue(e.target.value)}
                type="number" min="0.1" step={bonusType === "MULTIPLIER" ? "0.5" : "1"}
                className="h-10"
                placeholder={bonusType === "MULTIPLIER" ? "2" : "50"}
              />
            </div>
          </div>

          {/* Site scope */}
          <div className="space-y-2">
            <Label>
              Site Scope
              <span className="text-muted-foreground text-xs font-normal ml-1">optional — leave blank for all sites</span>
            </Label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm
                focus:outline-none focus:ring-2 focus:ring-foreground/20">
              <option value="">All Sites</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
      </div>
    </Modal>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export function LoyaltyManageClient({
  rewards: initialRewards, earnRules: initialEarnRules,
  products, categories, sites, pointsName, currencySymbol,
}: Props) {
  const [isPending, start]     = useTransition();
  const [tab,           setTab]           = useState<"rewards" | "rules">("rewards");
  const [rewards,       setRewards]       = useState(initialRewards);
  const [earnRules,     setEarnRules]     = useState(initialEarnRules);
  const [rewardModal,   setRewardModal]   = useState<Reward | "new" | null>(null);
  const [ruleModal,     setRuleModal]     = useState<EarnRule | "new" | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<{ type: "reward"|"rule"; id: string; name: string } | null>(null);

  function handleRewardSaved(r: Reward) {
    setRewards((p) => {
      const idx = p.findIndex((x) => x.id === r.id);
      return idx >= 0 ? p.map((x) => x.id === r.id ? r : x) : [r, ...p];
    });
  }

  function handleRuleSaved(r: EarnRule) {
    setEarnRules((p) => {
      const idx = p.findIndex((x) => x.id === r.id);
      return idx >= 0 ? p.map((x) => x.id === r.id ? r : x) : [r, ...p];
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    start(async () => {
      if (deleteTarget.type === "reward") {
        const res = await deleteRewardAction(deleteTarget.id);
        if (res.success) { setRewards((p) => p.filter((r) => r.id !== deleteTarget.id)); showToast.success("Reward deleted."); }
        else showToast.error(res.error);
      } else {
        const res = await deleteEarnRuleAction(deleteTarget.id);
        if (res.success) { setEarnRules((p) => p.filter((r) => r.id !== deleteTarget.id)); showToast.success("Rule deleted."); }
        else showToast.error(res.error);
      }
      setDeleteTarget(null);
    });
  }

  const REWARD_TYPE_LABEL: Record<RewardType, string> = {
    FREE_PRODUCT:     "Free Product",
    FIXED_DISCOUNT:   `${currencySymbol} Discount`,
    PERCENT_DISCOUNT: "% Discount",
    CUSTOM_VOUCHER:   "Custom Voucher",
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { key: "rewards" as const, label: "Rewards", icon: Gift    },
          { key: "rules"   as const, label: "Earn Rules", icon: Zap  },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2
              transition-colors -mb-px ${
              tab === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="h-4 w-4" /> {label}
            <span className="px-1.5 py-0.5 bg-muted rounded-lg text-xs">
              {key === "rewards" ? rewards.length : earnRules.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Rewards tab ── */}
      {tab === "rewards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Rewards customers can redeem with {pointsName}.
            </p>
            <Button onClick={() => setRewardModal("new")}>
              <Plus className="h-4 w-4" /> New Reward
            </Button>
          </div>

          {rewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center
              border-2 border-dashed border-border rounded-2xl">
              <Gift className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No rewards yet</p>
              <p className="text-sm text-muted-foreground">Create your first reward for customers to redeem</p>
              <Button onClick={() => setRewardModal("new")}>Create Reward</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {rewards.map((r) => (
                <div key={r.id}
                  className="flex items-center gap-4 px-5 py-4 border border-border rounded-2xl
                    hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    {r.type === "FREE_PRODUCT"     && <Package  className="h-5 w-5" />}
                    {r.type === "FIXED_DISCOUNT"   && <Gift     className="h-5 w-5" />}
                    {r.type === "PERCENT_DISCOUNT" && <Percent  className="h-5 w-5" />}
                    {r.type === "CUSTOM_VOUCHER"   && <FileText className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{r.name}</p>
                      <span className="text-xs px-1.5 py-0.5 bg-muted rounded-lg text-muted-foreground">
                        {REWARD_TYPE_LABEL[r.type]}
                      </span>
                      {!r.isActive && (
                        <span className="text-xs px-1.5 py-0.5 bg-destructive/10 text-destructive rounded-lg">
                          Inactive
                        </span>
                      )}
                      {!r.isGlobal && (
                        <span className="text-xs px-1.5 py-0.5 bg-info-muted text-info rounded-lg">
                          {sites.find((s) => s.id === r.siteId)?.name ?? "Site"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-warning" />
                        {r.pointsCost.toLocaleString()} {pointsName}
                      </span>
                      {r.type === "FIXED_DISCOUNT"   && r.discountValue &&
                        <span>{currencySymbol}{r.discountValue} off</span>}
                      {r.type === "PERCENT_DISCOUNT" && r.discountValue &&
                        <span>{r.discountValue}% off</span>}
                      {r.type === "FREE_PRODUCT"     && r.productName &&
                        <span>Free: {r.productName}</span>}
                      {r.maxRedemptions != null &&
                        <span>{r.redemptionCount}/{r.maxRedemptions} used</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => setRewardModal(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget({ type: "reward", id: r.id, name: r.name })}
                      className="hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Earn Rules tab ── */}
      {tab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Bonus {pointsName} for buying specific products or categories.
            </p>
            <Button onClick={() => setRuleModal("new")}>
              <Plus className="h-4 w-4" /> New Rule
            </Button>
          </div>

          {earnRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center
              border-2 border-dashed border-border rounded-2xl">
              <Zap className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No earn rules yet</p>
              <p className="text-sm text-muted-foreground">
                Add bonus rules to reward customers for buying specific items
              </p>
              <Button onClick={() => setRuleModal("new")}>
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {earnRules.map((r) => (
                <div key={r.id}
                  className="flex items-center gap-4 px-5 py-4 border border-border rounded-2xl
                    hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    {r.categoryId ? <Tag className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{r.name}</p>
                      {!r.isActive && (
                        <span className="text-xs px-1.5 py-0.5 bg-destructive/10 text-destructive rounded-lg">
                          Inactive
                        </span>
                      )}
                      {r.siteId && (
                        <span className="text-xs px-1.5 py-0.5 bg-info-muted text-info rounded-lg">
                          {sites.find((s) => s.id === r.siteId)?.name ?? "Site"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>
                        {r.categoryId ? `Category: ${r.categoryName}` : `Product: ${r.productName}`}
                      </span>
                      <span>·</span>
                      <span>
                        {r.bonusType === "MULTIPLIER"
                          ? `${r.bonusValue}× ${pointsName}`
                          : `+${r.bonusValue} ${pointsName} flat`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => setRuleModal(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget({ type: "rule", id: r.id, name: r.name })}
                      className="hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {rewardModal !== null && (
        <RewardModal
          reward={rewardModal === "new" ? undefined : rewardModal}
          products={products} sites={sites}
          pointsName={pointsName} currencySymbol={currencySymbol}
          onClose={() => setRewardModal(null)}
          onSaved={handleRewardSaved}
        />
      )}
      {ruleModal !== null && (
        <EarnRuleModal
          rule={ruleModal === "new" ? undefined : ruleModal}
          products={products} categories={categories} sites={sites}
          pointsName={pointsName}
          onClose={() => setRuleModal(null)}
          onSaved={handleRuleSaved}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "reward" ? "Reward" : "Earn Rule"}?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
