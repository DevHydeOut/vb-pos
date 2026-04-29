"use client";

// src/components/shared/modal.tsx
//
// Shared modal — used for every popup/dialog in the app.
// Designed for desktop + tablet first (larger fonts, generous padding).
//
// Usage:
//   <Modal open={open} onClose={onClose} title="Edit Product">
//     ...children
//   </Modal>
//
//   With description + footer:
//   <Modal
//     open={open} onClose={onClose}
//     title="Parent category"
//     description="Select a parent category to nest this category underneath it."
//     footer={
//       <div className="flex justify-end gap-3">
//         <Button variant="outline" onClick={onClose}>Cancel</Button>
//         <Button onClick={onConfirm}>Done</Button>
//       </div>
//     }
//   >
//     ...children
//   </Modal>
//
//   Size variants:
//     xs   → 400px  — quick pickers, tiny confirms
//     sm   → 520px  — product modal, variant picker
//     md   → 640px  — standard forms (default)
//     lg   → 800px  — complex forms, wide content
//     xl   → 1024px — full layouts
//     full → 100vw - 2.5rem

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** String → bold heading. ReactNode → fully custom header content */
  title?: React.ReactNode;
  /** String → muted subtitle. ReactNode → custom content below title */
  description?: React.ReactNode;
  /** Right side of header — for extra action buttons (e.g. Print button) */
  headerRight?: React.ReactNode;
  /** Sticky footer — action buttons live here */
  footer?: React.ReactNode;
  /** Width preset. Default: "md" */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  children?: React.ReactNode;
  /** Block closing on backdrop click / Escape. Default: false */
  persistent?: boolean;
  /** Hide the X close button. Default: false */
  hideClose?: boolean;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<ModalProps["size"]>, string> = {
  xs:   "max-w-[400px]",
  sm:   "max-w-[520px]",
  md:   "max-w-[640px]",
  lg:   "max-w-[800px]",
  xl:   "max-w-[1024px]",
  full: "max-w-[calc(100vw-2.5rem)]",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  headerRight,
  footer,
  size       = "md",
  children,
  persistent = false,
  hideClose  = false,
  className  = "",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, persistent]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (!persistent && e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50 backdrop-blur-[2px]"
      aria-modal="true"
      role="dialog"
    >
      <div className={[
        "relative w-full bg-background border border-border",
        "rounded-3xl shadow-2xl flex flex-col overflow-hidden",
        "max-h-[calc(100vh-2.5rem)]",
        SIZE_MAP[size],
        className,
      ].join(" ")}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        {(title || headerRight || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-7 pt-7 pb-5 shrink-0">
            <div className="min-w-0 flex-1 space-y-1.5">
              {title && (
                typeof title === "string"
                  ? <h2 className="text-xl font-bold leading-tight tracking-tight">{title}</h2>
                  : title
              )}
              {description && (
                typeof description === "string"
                  ? <p className="text-base text-muted-foreground leading-snug">{description}</p>
                  : <div className="text-base text-muted-foreground leading-snug">{description}</div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 -mt-1">
              {headerRight}
              {!hideClose && (
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="w-9 h-9 rounded-xl flex items-center justify-center
                    bg-muted text-muted-foreground
                    hover:bg-muted/80 hover:text-foreground
                    transition-colors shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
          {children}
        </div>

        {/* ── Sticky footer ───────────────────────────────────────────────── */}
        {footer && (
          <div className="border-t border-border px-7 py-5 shrink-0 bg-background">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}