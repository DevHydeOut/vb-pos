"use client";

// src/components/portal/inventory/stock-transfer-list-client.tsx

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowDown, ArrowUp, Clock, CheckCircle2,
  XCircle, Ban, ChevronRight, Plus, AlertCircle, Package,
  FileText, Minus,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  acceptStockTransferAction,
  rejectStockTransferAction,
  cancelStockTransferAction,
} from "@/actions/portal/stock-transfer";

// ─────────────────────────────────────────────────────────────
// Types (server sends these — simplified from Prisma types)
// ─────────────────────────────────────────────────────────────

type TransferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

interface TransferItem {
  id:               string;
  productId:        string;
  variantId:        string | null;
  quantitySent:     number;
  quantityReceived: number | null;
  costPrice:        number | null;
  product:          { id: string; name: string };
  variant:          { id: string; name: string } | null;
}

interface Transfer {
  id:           string;
  referenceNo:  string;
  status:       TransferStatus;
  fromSite:     { id: string; name: string };
  toSite:       { id: string; name: string };
  note:         string | null;
  generateBill: boolean;
  createdAt:    Date | string;
  acceptedAt:   Date | string | null;
  rejectedAt:   Date | string | null;
  rejectedNote: string | null;
  items:        TransferItem[];
}

interface StockTransferListClientProps {
  siteId:    string;
  transfers: Transfer[];
  currency:  string;
}

// ─────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────

const STATUS = {
  PENDING:   { label: "Pending",   icon: Clock,         color: "text-warning",   bg: "bg-warning-muted"  },
  ACCEPTED:  { label: "Accepted",  icon: CheckCircle2,  color: "text-success",  bg: "bg-success-muted" },
  REJECTED:  { label: "Rejected",  icon: XCircle,       color: "text-danger",      bg: "bg-danger-muted"     },
  CANCELLED: { label: "Cancelled", icon: Ban,           color: "text-muted-foreground", bg: "bg-muted"      },
} as const;

// ─────────────────────────────────────────────────────────────
// Transfer list component
// ─────────────────────────────────────────────────────────────

export function StockTransferListClient({ siteId, transfers, currency }: StockTransferListClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Transfer | null>(null);

  const pending    = transfers.filter((t) => t.status === "PENDING");
  const incomingPending = pending.filter((t) => t.toSite.id === siteId);
  const others     = transfers.filter((t) => t.status !== "PENDING");

  if (selected) {
    return (
      <StockTransferNewClient
        transfer={selected}
        siteId={siteId}
        currency={currency}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── New transfer button ── */}
      <div className="flex justify-end">
        <Button onClick={() => router.push(`/portal/${siteId}/inventory/transfers/new`)}>
          <Plus className="h-4 w-4" /> New Transfer
        </Button>
      </div>

      {/* ── Incoming pending — needs action ── */}
      {incomingPending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">Needs Your Action</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-xs font-bold text-white">
              {incomingPending.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {incomingPending.map((t) => (
              <TransferRow key={t.id} transfer={t} siteId={siteId} onClick={() => setSelected(t)} />
            ))}
          </div>
        </section>
      )}

      {/* ── All transfers ── */}
      {transfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center border border-dashed border-border rounded-2xl">
          <ArrowRight className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No transfers yet</p>
        </div>
      ) : (
        <section>
          <h3 className="text-sm font-semibold mb-3">All Transfers</h3>
          <div className="flex flex-col gap-2">
            {transfers.map((t) => (
              <TransferRow key={t.id} transfer={t} siteId={siteId} onClick={() => setSelected(t)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Transfer row (list item)
// ─────────────────────────────────────────────────────────────

function TransferRow({
  transfer,
  siteId,
  onClick,
}: { transfer: Transfer; siteId: string; onClick: () => void }) {
  const cfg        = STATUS[transfer.status];
  const Icon       = cfg.icon;
  const isIncoming = transfer.toSite.id === siteId;
  const isOutgoing = transfer.fromSite.id === siteId;
  const totalUnits = transfer.items.reduce((s, i) => s + i.quantitySent, 0);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 border border-border rounded-2xl hover:bg-muted/40 transition-colors text-left"
    >
      {/* Direction indicator */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
        {isIncoming && !isOutgoing ? (
          <ArrowDown className={`h-4 w-4 ${cfg.color}`} />
        ) : (
          <ArrowUp className={`h-4 w-4 ${cfg.color}`} />
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold font-mono">{transfer.referenceNo}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isIncoming && !isOutgoing ? "From " : "To "}
          <span className="font-medium text-foreground">
            {isIncoming && !isOutgoing ? transfer.fromSite.name : transfer.toSite.name}
          </span>
          {" · "}
          {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
          {" · "}
          {new Date(transfer.createdAt).toLocaleDateString()}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Transfer detail + accept/reject
// ─────────────────────────────────────────────────────────────

function StockTransferNewClient({
  transfer,
  siteId,
  currency,
  onBack,
}: { transfer: Transfer; siteId: string; currency: string; onBack: () => void }) {
  const cfg        = STATUS[transfer.status];
  const Icon       = cfg.icon;
  const isRecipient = transfer.toSite.id === siteId;
  const canAct     = isRecipient && transfer.status === "PENDING";
  const canCancel  = transfer.fromSite.id === siteId && transfer.status === "PENDING";

  // Editable received quantities (for partial accept)
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(
    Object.fromEntries(transfer.items.map((i) => [i.id, i.quantitySent]))
  );
  const [rejectNote, setRejectNote]     = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  const totalSent     = transfer.items.reduce((s, i) => s + i.quantitySent, 0);
  const totalReceived = Object.values(receivedQtys).reduce((s, v) => s + v, 0);
  const totalValue    = transfer.items.reduce((s, i) => s + i.quantitySent * (i.costPrice ?? 0), 0);

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const qtys = transfer.items.map((i) => ({
        itemId:           i.id,
        quantityReceived: receivedQtys[i.id] ?? i.quantitySent,
      }));
      const res = await acceptStockTransferAction(transfer.id, siteId, qtys);
      if (!res.success) setError(res.error);
      else onBack();
    });
  };

  const handleReject = () => {
    setError(null);
    startTransition(async () => {
      const res = await rejectStockTransferAction(transfer.id, siteId, rejectNote || undefined);
      if (!res.success) setError(res.error);
      else onBack();
    });
  };

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const res = await cancelStockTransferAction(transfer.id, siteId);
      if (!res.success) setError(res.error);
      else onBack();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Back + header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold font-mono">{transfer.referenceNo}</h2>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
              <Icon className="h-3 w-3" /> {cfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(transfer.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Route ── */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 border border-border rounded-2xl bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">From</p>
          <p className="text-sm font-semibold">{transfer.fromSite.name}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="text-right">
          <p className="text-xs text-muted-foreground">To</p>
          <p className="text-sm font-semibold">{transfer.toSite.name}</p>
        </div>
      </div>

      {/* ── Note ── */}
      {transfer.note && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-muted/50 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-muted-foreground">{transfer.note}</p>
        </div>
      )}

      {/* ── Items ── */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Items</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Product</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Sent</th>
              {canAct && (
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Received</th>
              )}
              {!canAct && transfer.status === "ACCEPTED" && (
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Received</th>
              )}
              {transfer.generateBill && (
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Value</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transfer.items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.product.name}</p>
                  {item.variant && <p className="text-xs text-muted-foreground">{item.variant.name}</p>}
                </td>
                <td className="px-4 py-3 text-right font-medium">{item.quantitySent}</td>

                {/* Editable received qty (only when recipient + pending) */}
                {canAct && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setReceivedQtys((p) => ({ ...p, [item.id]: Math.max(0, (p[item.id] ?? item.quantitySent) - 1) }))}
                        className="w-6 h-6 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        value={receivedQtys[item.id] ?? item.quantitySent}
                        onChange={(e) => setReceivedQtys((p) => ({ ...p, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        min="0"
                        max={item.quantitySent}
                        className="w-14 text-center h-7 border border-border rounded-lg text-sm bg-background font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={() => setReceivedQtys((p) => ({ ...p, [item.id]: Math.min(item.quantitySent, (p[item.id] ?? item.quantitySent) + 1) }))}
                        className="w-6 h-6 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                )}

                {/* Show final received qty (after accept) */}
                {!canAct && transfer.status === "ACCEPTED" && (
                  <td className="px-4 py-3 text-right">
                    <span className={item.quantityReceived !== item.quantitySent ? "text-warning font-medium" : "font-medium"}>
                      {item.quantityReceived ?? item.quantitySent}
                    </span>
                    {item.quantityReceived !== null && item.quantityReceived !== item.quantitySent && (
                      <p className="text-xs text-warning">partial</p>
                    )}
                  </td>
                )}

                {transfer.generateBill && (
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {item.costPrice != null
                      ? `${currency} ${(item.quantitySent * item.costPrice).toFixed(2)}`
                      : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/30">
              <td className="px-4 py-3 text-sm font-medium">{transfer.items.length} items</td>
              <td className="px-4 py-3 text-right text-sm font-semibold">{totalSent}</td>
              {canAct && (
                <td className="px-4 py-3 text-center text-sm font-semibold">{totalReceived}</td>
              )}
              {!canAct && transfer.status === "ACCEPTED" && <td />}
              {transfer.generateBill && (
                <td className="px-4 py-3 text-right text-sm font-semibold">
                  {totalValue > 0 ? `${currency} ${totalValue.toFixed(2)}` : "—"}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Rejection note (if rejected) ── */}
      {transfer.status === "REJECTED" && transfer.rejectedNote && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-danger-muted text-sm text-danger">
          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p><span className="font-medium">Rejection reason:</span> {transfer.rejectedNote}</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Actions ── */}
      {canAct && !showRejectForm && (
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10" onClick={() => setShowRejectForm(true)} disabled={isPending}>
            <XCircle className="h-4 w-4" /> Reject
          </Button>
          <Button className="flex-1 bg-success text-success-foreground hover:bg-success/90" onClick={handleAccept} disabled={isPending}>
            <CheckCircle2 className="h-4 w-4" />
            {isPending ? "Saving…" : totalReceived < totalSent ? `Accept ${totalReceived} of ${totalSent}` : "Accept All"}
          </Button>
        </div>
      )}

      {/* ── Reject form ── */}
      {canAct && showRejectForm && (
        <div className="flex flex-col gap-3 p-4 border border-red-200 rounded-2xl bg-danger/5">
          <p className="text-sm font-medium text-danger">Reject this transfer?</p>
          <input
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason for rejection (optional)"
            className="w-full h-9 px-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-3">
            <Button
              onClick={() => setShowRejectForm(false)}
              variant="outline" className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isPending}
              variant="destructive" className="flex-1"
            >
              {isPending ? "Rejecting…" : "Confirm Reject"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Cancel (sender) ── */}
      {canCancel && (
        <Button variant="outline" onClick={handleCancel} disabled={isPending}>
          <Ban className="h-4 w-4" /> Cancel Transfer
        </Button>
      )}
    </div>
  );
}