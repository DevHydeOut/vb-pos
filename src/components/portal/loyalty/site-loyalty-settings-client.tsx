"use client";

// src/components/portal/loyalty/site-loyalty-settings-client.tsx

import { useState, useTransition } from "react";
import { toast }                   from "sonner";
import { Loader2, Info }           from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { updateSiteLoyaltyOverrideAction } from "@/actions/portal/loyalty";

interface Props {
  siteId:        string;
  masterProgram: { isEnabled: boolean; pointsPerUnit: number; unitValue: number; pointsName: string } | null;
  siteOverride:  { isEnabled: boolean; pointsPerUnit: number | null; unitValue: number | null } | null;
  currencySymbol: string;
}

export function SiteLoyaltySettingsClient({
  siteId, masterProgram, siteOverride, currencySymbol,
}: Props) {
  const [isPending, start] = useTransition();

  const masterEnabled = masterProgram?.isEnabled ?? false;

  const [isEnabled,     setIsEnabled]     = useState(siteOverride?.isEnabled    ?? masterEnabled);
  const [pointsPerUnit, setPointsPerUnit] = useState(String(siteOverride?.pointsPerUnit ?? ""));
  const [unitValue,     setUnitValue]     = useState(String(siteOverride?.unitValue     ?? ""));

  const effectivePPU = parseFloat(pointsPerUnit) || masterProgram?.pointsPerUnit || 1;
  const effectiveUV  = parseFloat(unitValue)     || masterProgram?.unitValue     || 1;
  const previewPoints = Math.floor((100 / effectiveUV) * effectivePPU);
  const pointsName    = masterProgram?.pointsName ?? "Points";

  function save() {
    start(async () => {
      const fd = new FormData();
      fd.append("isEnabled",    String(isEnabled));
      fd.append("pointsPerUnit", pointsPerUnit);
      fd.append("unitValue",    unitValue);
      const res = await updateSiteLoyaltyOverrideAction(siteId, fd);
      if (res.success) toast.success("Site loyalty settings saved.");
      else             toast.error(res.error);
    });
  }

  // Master has disabled loyalty entirely
  if (!masterEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-xl">⭐</div>
        <p className="font-semibold">Loyalty program is disabled</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          The loyalty program has been disabled at the business level.
          Contact your administrator to enable it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Site toggle */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          This Site
        </h2>
        <button
          type="button"
          onClick={() => setIsEnabled((p) => !p)}
          className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 w-full text-left
            transition-all ${isEnabled
              ? "border-foreground bg-foreground/5"
              : "border-border hover:border-foreground/30"}`}>
          <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0
            ${isEnabled ? "bg-foreground" : "bg-muted"}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm
              transition-transform ${isEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </div>
          <div>
            <p className="font-semibold">{isEnabled ? "Enabled at this site" : "Disabled at this site"}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEnabled
                ? `Customers earn ${pointsName} when buying here`
                : "No points earned or redeemed at this site"}
            </p>
          </div>
        </button>
      </section>

      {isEnabled && (
        <section className="space-y-5">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Earn Rate Override
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Leave blank to use the master rate ({masterProgram?.pointsPerUnit} {pointsName} per {currencySymbol}{masterProgram?.unitValue}).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Override points</Label>
              <Input value={pointsPerUnit}
                onChange={(e) => setPointsPerUnit(e.target.value)}
                type="number" min="1" step="1" className="h-11"
                placeholder={String(masterProgram?.pointsPerUnit ?? 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Per {currencySymbol} amount</Label>
              <Input value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
                type="number" min="0.01" step="0.01" className="h-11"
                placeholder={String(masterProgram?.unitValue ?? 1)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 px-4 py-3 bg-muted/50 rounded-xl">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              At this site, {currencySymbol}100 spent earns{" "}
              <span className="font-semibold text-foreground">{previewPoints.toLocaleString()} {pointsName}</span>
            </p>
          </div>
        </section>
      )}

      <Button onClick={save} disabled={isPending} className="h-11 px-8">
        {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save Settings
      </Button>
    </div>
  );
}