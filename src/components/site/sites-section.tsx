"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SiteCard, SiteCardData } from "@/components/site/site-card";
import { CreateSiteModal }        from "@/components/site/create-site-modal";
import { EditSiteModal }          from "@/components/site/edit-site-modal";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";

interface SitesSectionProps {
  sites:     SiteCardData[];
  accountId: string;
}

// This is a client component that handles all modal state.
// The parent dashboard page (server component) passes sites as props.
export function SitesSection({ sites, accountId }: SitesSectionProps) {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editSite,   setEditSite]   = useState<SiteCardData | null>(null);

  // Refresh server component data after any mutation
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-4">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your Sites</h2>
          <p className="text-sm text-gray-500">
            {sites.length === 0
              ? "No sites yet"
              : `${sites.length} site${sites.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Site
        </Button>
      </div>

      {/* Empty state */}
      {sites.length === 0 && (
        <div className="border-2 border-dashed rounded-2xl p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-gray-100 rounded-full p-4">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-700">No sites yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create your first site to start managing your business.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Site
          </Button>
        </div>
      )}

      {/* Sites grid */}
      {sites.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onEdit={setEditSite}
              onRefresh={refresh}
            />
          ))}

          {/* Add another site card */}
          <button
            onClick={() => setCreateOpen(true)}
            className="border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all min-h-35"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Add Site</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateSiteModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={refresh}
      />

      <EditSiteModal
        site={editSite}
        open={!!editSite}
        onOpenChange={(o) => { if (!o) setEditSite(null); }}
        onSuccess={refresh}
      />
    </div>
  );
}