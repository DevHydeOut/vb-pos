"use client";

import { useRef, useState, useTransition } from "react";
import { createSiteAction } from "@/actions/site/create";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, Loader2, Building2 } from "lucide-react";

interface CreateSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSiteModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateSiteModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError]             = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccessName(null);

    startTransition(async () => {
      const res = await createSiteAction(formData);
      if (res.success) {
        setSuccessName(res.siteName);
        formRef.current?.reset();
        onSuccess();
      } else {
        setError(res.error);
      }
    });
  }

  function handleClose(open: boolean) {
    if (!isPending) {
      setError(null);
      setSuccessName(null);
      formRef.current?.reset();
      onOpenChange(open);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-primary/10 rounded-xl p-2.5">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold">Create New Site</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 ml-0.5">
            Add a new business location. Only the site name is required.
          </DialogDescription>
        </div>

        {/* Body */}
        <form ref={formRef} action={handleSubmit}>
          <div className="px-7 py-6 space-y-5">

            {/* Success banner */}
            {successName && (
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  &quot;{successName}&quot; created! You can create another or close.
                </p>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Site Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Main Branch, Downtown Clinic"
                required
                disabled={isPending}
                autoFocus
                className="h-11"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                Address{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="address"
                name="address"
                placeholder="e.g. 123 Main Street, Mumbai 400001"
                rows={3}
                disabled={isPending}
                className="resize-none"
              />
            </div>

            {/* Phone + Tax side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  disabled={isPending}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxNumber" className="text-sm font-medium">
                  GST / Tax No.{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="taxNumber"
                  name="taxNumber"
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  disabled={isPending}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-7 py-5 border-t border-border flex items-center gap-3">
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 h-11"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Site"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleClose(false)}
              className="flex-1 h-11"
            >
              {successName ? "Done" : "Cancel"}
            </Button>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  );
}