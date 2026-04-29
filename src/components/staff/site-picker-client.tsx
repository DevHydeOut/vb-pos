"use client";

import { useRouter }  from "next/navigation";
import { ROUTES }     from "@/routes";
import { Building2, ArrowRight, MapPin, Phone } from "lucide-react";

interface Site {
  id:      string;
  name:    string;
  address: string | null;
  phone:   string | null;
}

export function SitePickerClient({ sites }: { sites: Site[] }) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {sites.map((site) => {
        const initials = site.name
          .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

        return (
          <button
            key={site.id}
            onClick={() => router.push(ROUTES.staff.site(site.id))}
            className="group w-full bg-card border border-border rounded-2xl p-5
              flex items-center gap-4 hover:border-foreground/25 hover:shadow-md
              transition-all text-left"
          >
            {/* Site avatar */}
            <div className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center
              shrink-0 group-hover:scale-105 transition-transform">
              <span className="text-sm font-bold text-background">{initials}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-semibold text-foreground">{site.name}</p>
              <div className="flex items-center gap-3 flex-wrap">
                {site.address && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                    <MapPin className="h-3 w-3 shrink-0" /> {site.address}
                  </span>
                )}
                {site.phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" /> {site.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center
              shrink-0 group-hover:border-foreground/30 group-hover:bg-muted/50 transition-all">
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground
                group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        );
      })}
    </div>
  );
}