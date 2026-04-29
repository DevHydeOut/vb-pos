"use client";

// src/components/shared/confirm-dialog.tsx
// Reusable confirmation for all destructive/irreversible actions.
// Built on top of shared Modal.
//
// Usage:
//   <ConfirmDialog
//     open={open}
//     onClose={() => setOpen(false)}
//     onConfirm={handleDelete}
//     title="Delete product?"
//     description="This will permanently remove Wireless Headphones. This cannot be undone."
//     confirmLabel="Delete"
//     variant="destructive"
//   />

import { useTransition } from "react";
import { AlertTriangle, Trash2, AlertCircle } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning" | "default";
}

const CONFIG = {
  destructive: {
    Icon:      Trash2,
    iconBg:    "bg-danger-muted",
    iconColor: "text-danger",
  },
  warning: {
    Icon:      AlertTriangle,
    iconBg:    "bg-warning-muted",
    iconColor: "text-warning",
  },
  default: {
    Icon:      AlertCircle,
    iconBg:    "bg-muted",
    iconColor: "text-muted-foreground",
  },
} as const;

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  variant      = "destructive",
}: ConfirmDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { Icon, iconBg, iconColor }  = CONFIG[variant];

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm();
      onClose();
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xs"
      persistent={isPending}
      hideClose
      footer={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onClose}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Please wait…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="px-7 py-6 flex flex-col items-center text-center gap-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          {description && (
            <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}