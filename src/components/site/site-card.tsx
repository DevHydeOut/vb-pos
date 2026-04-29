"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ROUTES } from "@/routes";
import { Building2, MoreVertical, Pencil, PowerOff, Power, Trash2, Users } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleSiteAction, deleteSiteAction } from "@/actions/site/delete";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export interface SiteCardData {
  id:        string;
  name:      string;
  address:   string | null;
  phone:     string | null;
  taxNumber: string | null;
  isActive:  boolean;
  createdAt: Date;
  _count?:   { subUserSites: number };
}

interface SiteCardProps {
  site:      SiteCardData;
  onEdit:    (site: SiteCardData) => void;
  onRefresh: () => void;
}

export function SiteCard({ site, onEdit, onRefresh }: SiteCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggleActive() {
    startTransition(async () => {
      await toggleSiteAction(site.id, !site.isActive);
      toast.success(site.isActive ? `"${site.name}" deactivated.` : `"${site.name}" activated.`);
      onRefresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSiteAction(site.id);
      toast.success(`"${site.name}" deleted.`);
      setShowDeleteDialog(false);
      onRefresh();
    });
  }

  return (
    <>
      <div className={`group relative border rounded-2xl p-5 bg-card transition-all space-y-3
        ${site.isActive ? "hover:border-primary/40 hover:shadow-md" : "opacity-60 border-dashed"}`}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <Link href={ROUTES.dashboard.site(site.id)} className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`rounded-xl p-2 shrink-0 transition-colors
              ${site.isActive ? "bg-primary/10 group-hover:bg-primary/20" : "bg-muted"}`}>
              <Building2 className={`h-5 w-5 ${site.isActive ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{site.name}</h3>
              {!site.isActive && <Badge variant="secondary" className="text-xs mt-0.5">Inactive</Badge>}
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"
                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isPending}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(site)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Site
              </DropdownMenuItem>
              {/* Points to global staff page, pre-filtered by this site */}
              <DropdownMenuItem asChild>
                <Link href={ROUTES.dashboard.staffBySite(site.id)}>
                  <Users className="mr-2 h-4 w-4" /> Manage Staff
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleActive}>
                {site.isActive
                  ? <><PowerOff className="mr-2 h-4 w-4" /> Deactivate</>
                  : <><Power    className="mr-2 h-4 w-4" /> Activate</>
                }
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Site
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Details */}
        <Link href={ROUTES.dashboard.site(site.id)} className="block space-y-1">
          {site.phone     && <p className="text-xs text-muted-foreground truncate">📞 {site.phone}</p>}
          {site.address   && <p className="text-xs text-muted-foreground truncate">📍 {site.address}</p>}
          {site.taxNumber && <p className="text-xs text-muted-foreground truncate">🧾 {site.taxNumber}</p>}
          {!site.phone && !site.address && !site.taxNumber && (
            <p className="text-xs text-muted-foreground italic">No additional details</p>
          )}
        </Link>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <Link href={ROUTES.dashboard.staffBySite(site.id)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Users className="h-3.5 w-3.5" />
            {site._count?.subUserSites ?? 0} staff
          </Link>
          <p className="text-xs text-muted-foreground">{formatDate(site.createdAt)}</p>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{site.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this site, all staff accounts, permissions, and records. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}
              className="bg-destructive hover:bg-destructive/90">
              {isPending ? "Deleting..." : "Yes, Delete Site"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}