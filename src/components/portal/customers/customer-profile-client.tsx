"use client";

// src/components/portal/customers/customer-profile-client.tsx

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { toast }                   from "sonner";
import {
  Phone, Mail, Calendar, FileText, Star, TrendingUp,
  ArrowUpRight, ArrowDownRight, RotateCcw, SlidersHorizontal,
  Pencil, ChevronLeft, Loader2, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { adjustCustomerPointsAction } from "@/actions/portal/loyalty";
import { Modal } from "@/components/shared/modal";
import { PageHeader } from "@/components/shared/page-header";

/* ── Types ───────────────────────────────────────────────────── */

interface Transaction {
  id:            string;
  type:          string;
  points:        number;
  balanceBefore: number;
  balanceAfter:  number;
  note:          string | null;
  rewardName:    string | null;
  createdAt:     Date;
}

interface Customer {
  id:             string;
  name:           string;
  phone:          string;
  email:          string | null;
  dateOfBirth:    Date | null;
  notes:          string | null;
  isActive:       boolean;
  createdAt:      Date;
  currentPoints:  number;
  lifetimePoints: number;
  lifetimeSpend:  number;
  transactions:   Transaction[];
}

interface Props {
  customer:       Customer;
  siteId:         string | null;
  isMaster:       boolean;
  loyaltyEnabled: boolean;
  pointsName:     string;
  backUrl:        string;
}

/* ── TX type display helpers ─────────────────────────────────── */

const TX_CONFIG: Record<string, {
  label: string;
  icon:  React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  EARN:   { label: "Earned",   icon: ArrowUpRight,   color: "text-success" },
  BONUS:  { label: "Bonus",    icon: ArrowUpRight,   color: "text-info"    },
  REDEEM: { label: "Redeemed", icon: ArrowDownRight, color: "text-warning"   },
  EXPIRE: { label: "Expired",  icon: RotateCcw,      color: "text-muted-foreground" },
  ADJUST: { label: "Adjusted", icon: SlidersHorizontal, color: "text-purple-600" },
};

/* ── Adjust Points Modal ─────────────────────────────────────── */

function AdjustModal({
  customer,
  siteId,
  pointsName,
  onClose,
  onSuccess,
}: {
  customer:   Customer;
  siteId:     string | null;
  pointsName: string;
  onClose:    () => void;
  onSuccess:  (newBalance: number) => void;
}) {
  const [amount,  setAmount]  = useState("");
  const [note,    setNote]    = useState("");
  const [type,    setType]    = useState<"add" | "deduct">("add");
  const [isPending, start]    = useTransition();

  function handleSubmit() {
    const pts = parseInt(amount, 10);
    if (!pts || pts <= 0)  { toast.error("Enter a valid number of points"); return; }
    if (!note.trim())      { toast.error("Reason is required");             return; }

    start(async () => {
      const finalPts = type === "add" ? pts : -pts;
      const res = await adjustCustomerPointsAction(
        customer.id, finalPts, note.trim(), siteId
      );
      if (res.success) {
        const newBalance = Math.max(0, customer.currentPoints + finalPts);
        toast.success(`${pointsName} adjusted successfully`);
        onSuccess(newBalance);
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-background
        border border-border rounded-2xl shadow-2xl max-w-sm mx-auto overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Adjust {pointsName}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Add / Deduct toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(["add", "deduct"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors
                  ${type === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
                {t === "add" ? "Add Points" : "Deduct Points"}
              </button>
            ))}
          </div>

          {/* Current balance */}
          <div className="px-4 py-3 bg-muted/50 rounded-xl">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-xl font-bold mt-0.5">
              {customer.currentPoints.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">{pointsName}</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{pointsName} to {type}</Label>
            <Input
              type="number" min="1"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100" className="h-10"
              autoFocus
            />
            {amount && parseInt(amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                New balance:{" "}
                <span className="font-semibold text-foreground">
                  {Math.max(0, customer.currentPoints + (type === "add" ? 1 : -1) * parseInt(amount)).toLocaleString()}
                </span>{" "}{pointsName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason <span className="text-destructive">*</span></Label>
            <Input
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Goodwill gesture, correction..."
              className="h-10"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span className="ml-1.5">Confirm</span>
          </Button>
        </div>
      </div>
    </>
  );
}

/* ── Main Profile Component ──────────────────────────────────── */

export function CustomerProfileClient({
  customer, siteId, isMaster, loyaltyEnabled, pointsName, backUrl,
}: Props) {
  const router = useRouter();
  const [adjustOpen, setAdjustOpen]   = useState(false);
  const [currentPoints, setCurrentPoints] = useState(customer.currentPoints);
  const [txFilter, setTxFilter]       = useState<"all" | "earn" | "redeem" | "adjust">("all");

  const editUrl = siteId
    ? `/portal/${siteId}/customers/${customer.id}/edit`
    : `/dashboard/manage/customers/${customer.id}/edit`;

  const filteredTx = customer.transactions.filter((tx) => {
    if (txFilter === "earn")   return ["EARN",   "BONUS"].includes(tx.type);
    if (txFilter === "redeem") return tx.type === "REDEEM";
    if (txFilter === "adjust") return ["ADJUST", "EXPIRE"].includes(tx.type);
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Back + Edit header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push(backUrl)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Customers
        </button>
        <button onClick={() => router.push(editUrl)}
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl
            text-sm hover:bg-muted transition-colors">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      {/* Customer card */}
      <div className="border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center
            text-xl font-bold text-muted-foreground shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <PageHeader title="customer.name" />
              {!customer.isActive && (
                <span className="px-2 py-0.5 bg-muted rounded-lg text-xs text-muted-foreground">
                  Inactive
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.dateOfBirth && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{new Date(customer.dateOfBirth).toLocaleDateString()}</span>
                </div>
              )}
              {customer.notes && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{customer.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Member since */}
        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          Customer since {new Date(customer.createdAt).toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* Loyalty stats */}
      {loyaltyEnabled && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {pointsName} Balance
            </h2>
            {/* Master-only: adjust points */}
            {isMaster && (
              <button onClick={() => setAdjustOpen(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground
                  hover:text-foreground transition-colors border border-border
                  rounded-lg px-2.5 py-1.5">
                <SlidersHorizontal className="h-3 w-3" /> Adjust
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-warning" />
                <p className="text-xs text-muted-foreground">Current {pointsName}</p>
              </div>
              <p className="text-2xl font-bold">{currentPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Available to redeem</p>
            </div>
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-success" />
                <p className="text-xs text-muted-foreground">Lifetime {pointsName}</p>
              </div>
              <p className="text-2xl font-bold">{customer.lifetimePoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total ever earned</p>
            </div>
          </div>

          {/* Transaction history */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Transaction History</h3>
              <div className="flex gap-1">
                {(["all", "earn", "redeem", "adjust"] as const).map((f) => (
                  <button key={f} onClick={() => setTxFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                      txFilter === f
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredTx.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No {txFilter === "all" ? "" : txFilter} transactions yet
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTx.map((tx) => {
                  const config = TX_CONFIG[tx.type] ?? TX_CONFIG.ADJUST;
                  const Icon   = config.icon;
                  return (
                    <div key={tx.id}
                      className="flex items-center gap-3 px-4 py-3 border border-border rounded-xl">
                      <div className={`w-8 h-8 rounded-full bg-muted flex items-center
                        justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{config.label}</p>
                          {tx.rewardName && (
                            <span className="text-xs text-muted-foreground truncate">
                              — {tx.rewardName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tx.note ?? new Date(tx.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "numeric", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${
                          tx.points > 0 ? "text-success" : "text-danger"
                        }`}>
                          {tx.points > 0 ? "+" : ""}{tx.points.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          → {tx.balanceAfter.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjust modal */}
      {adjustOpen && (
        <AdjustModal
          customer={{ ...customer, currentPoints }}
          siteId={siteId}
          pointsName={pointsName}
          onClose={() => setAdjustOpen(false)}
          onSuccess={(newBal) => setCurrentPoints(newBal)}
        />
      )}
    </div>
  );
}