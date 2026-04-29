"use client";

import { useRef, useTransition, useEffect } from "react";
import { updateSiteAction } from "@/actions/site/update";
import { toast } from "sonner";
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
import { Loader2 }  from "lucide-react";

interface Site {
  id:        string;
  name:      string;
  address:   string | null;
  phone:     string | null;
  taxNumber: string | null;
}

interface EditSiteModalProps {
  site:         Site | null;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
}

export function EditSiteModal({ site, open, onOpenChange, onSuccess }: EditSiteModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  // Reset form when a different site is loaded
  useEffect(() => {
    if (open && site) formRef.current?.reset();
  }, [open, site?.id]);

  function handleSubmit(formData: FormData) {
    if (!site) return;
    formData.append("siteId", site.id);

    startTransition(async () => {
      const res = await updateSiteAction(formData);

      if (res.success) {
        toast.success("Site updated successfully.");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Site</DialogTitle>
          <DialogDescription>Update details for {site?.name}.</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">
              Site Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={site?.name}
              required
              disabled={isPending}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-address">
              Address{" "}
              <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="edit-address"
              name="address"
              defaultValue={site?.address ?? ""}
              rows={2}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">
              Phone Number{" "}
              <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </Label>
            <Input
              id="edit-phone"
              name="phone"
              type="tel"
              defaultValue={site?.phone ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-taxNumber">
              GST / Tax Number{" "}
              <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </Label>
            <Input
              id="edit-taxNumber"
              name="taxNumber"
              defaultValue={site?.taxNumber ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}