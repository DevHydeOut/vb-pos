"use client";

// src/components/dashboard/loyalty/loyalty-settings-client.tsx

import { useState, useTransition } from "react";
import { toast }                   from "sonner";
import { Loader2, Star, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { showToast } from "@/lib/toast";
import {
  updateLoyaltyProgramAction,
  updateSiteLoyaltyOverrideAction,
} from "@/actions/portal/loyalty";

interface SiteOverride {
  siteId:       string;
  siteName:     string;
  isEnabled:    boolean;
  pointsPerUnit: number | null;
  unitValue:    number | null;
}

interface Program {
  isEnabled:     boolean;
  pointsPerUnit: number;
  unitValue:     number;
  pointsName:    string;
  expiryDays:    number | null;
  siteOverrides: SiteOverride[];
}

interface Props {
  program?:       Program | null;
  sites:          { id: string; name: string }[];
  currencySymbol: string;
}

export function LoyaltySettingsClient({ program, sites, currencySymbol }: Props) {
  const [isPending, start] = useTransition();

  // Program fields
  const [isEnabled,     setIsEnabled]     = useState(program?.isEnabled     ?? false);
  const [pointsPerUnit, setPointsPerUnit] = useState(String(program?.pointsPerUnit ?? 1));
  const [unitValue,     setUnitValue]     = useState(String(program?.unitValue     ?? 1));
  const [pointsName,    setPointsName]    = useState(program?.pointsName    ?? "Points");
  const [expiryDays,    setExpiryDays]    = useState(String(program?.expiryDays    ?? ""));

  // Site overrides state
  const [overrides, setOverrides] = useState<Record<string, {
    isEnabled: boolean; pointsPerUnit: string; unitValue: string; open: boolean;
  }>>(
    Object.fromEntries(sites.map((s) => {
      const ov = program?.siteOverrides.find((o) => o.siteId === s.id);
      return [s.id, {
        isEnabled:    ov?.isEnabled    ?? true,
        pointsPerUnit: String(ov?.pointsPerUnit ?? ""),
        unitValue:    String(ov?.unitValue    ?? ""),
        open:         false,
      }];
    }))
  );

  function saveProgram() {
    start(async () => {
      const fd = new FormData();
      fd.append("isEnabled",     String(isEnabled));
      fd.append("pointsPerUnit", pointsPerUnit);
      fd.append("unitValue",     unitValue);
      fd.append("pointsName",    pointsName);
      fd.append("expiryDays",    expiryDays);
      const res = await updateLoyaltyProgramAction(fd);
      if (res.success) showToast.success("Loyalty program saved.");
      else             showToast.error(res.error);
    });
  }

  function saveSiteOverride(siteId: string) {
    const ov = overrides[siteId];
    start(async () => {
      const fd = new FormData();
      fd.append("isEnabled",    String(ov.isEnabled));
      fd.append("pointsPerUnit", ov.pointsPerUnit);
      fd.append("unitValue",    ov.unitValue);
      const res = await updateSiteLoyaltyOverrideAction(siteId, fd);
      if (res.success) showToast.success("Site override saved.");
      else             showToast.error(res.error);
    });
  }

  // Example calculation preview
  const previewPoints = Math.floor(
    (100 / (parseFloat(unitValue) || 1)) * (parseInt(pointsPerUnit) || 1)
  );

  return (
    <div className="space-y-10">

      {/* Master toggle */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Program Status
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
            <p className="font-semibold">{isEnabled ? "Enabled" : "Disabled"}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEnabled
                ? "Customers earn and redeem points across your business"
                : "No points will be earned or redeemed at any site"}
            </p>
          </div>
        </button>
      </section>

      {isEnabled && (
        <>
          {/* Earn rate */}
          <section className="space-y-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Earn Rate
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points awarded</Label>
                <Input value={pointsPerUnit}
                  onChange={(e) => setPointsPerUnit(e.target.value)}
                  type="number" min="1" step="1" className="h-11"
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  Points given per unit spent
                </p>
              </div>
              <div className="space-y-2">
                <Label>Per {currencySymbol} amount</Label>
                <Input value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                  type="number" min="0.01" step="0.01" className="h-11"
                  placeholder="1.00"
                />
                <p className="text-xs text-muted-foreground">
                  Spend amount per unit
                </p>
              </div>
            </div>

            {/* Live preview */}
            <div className="flex items-start gap-2 px-4 py-3 bg-muted/50 rounded-xl">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                A customer spending{" "}
                <span className="font-semibold text-foreground">{currencySymbol}100</span> earns{" "}
                <span className="font-semibold text-foreground">
                  {isNaN(previewPoints) ? "–" : previewPoints.toLocaleString()}
                </span>{" "}
                <span className="font-semibold text-foreground">{pointsName || "Points"}</span>
              </p>
            </div>
          </section>

          {/* Points name + expiry */}
          <section className="space-y-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Display Settings
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points name</Label>
                <div className="relative">
                  <Star className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={pointsName}
                    onChange={(e) => setPointsName(e.target.value)}
                    className="h-11 pl-10"
                    placeholder="Points"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  e.g. Points, Stars, Coins, Credits
                </p>
              </div>
              <div className="space-y-2">
                <Label>
                  Points expiry
                  <span className="text-muted-foreground text-xs font-normal ml-1">optional</span>
                </Label>
                <div className="relative">
                  <Input value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    type="number" min="1" step="1"
                    className="h-11 pr-14"
                    placeholder="Never"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    days
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank for points that never expire
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Save */}
      <Button onClick={saveProgram} disabled={isPending} className="h-11 px-8">
        {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save Program Settings
      </Button>

      {/* Per-site overrides */}
      {isEnabled && sites.length > 0 && (
        <section className="space-y-4 border-t border-border pt-8">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Site Overrides
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Each site inherits the master settings above. You can override per site.
            </p>
          </div>
          <div className="space-y-3">
            {sites.map((site) => {
              const ov = overrides[site.id];
              if (!ov) return null;
              return (
                <div key={site.id}
                  className="border border-border rounded-2xl overflow-hidden">
                  {/* Site header row */}
                  <button
                    onClick={() => setOverrides((p) => ({
                      ...p, [site.id]: { ...p[site.id], open: !p[site.id].open },
                    }))}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${ov.isEnabled ? "bg-success" : "bg-muted-foreground"}`} />
                      <p className="font-medium text-sm">{site.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {ov.isEnabled ? "Enabled" : "Disabled"}
                        {ov.isEnabled && ov.pointsPerUnit
                          ? ` · ${ov.pointsPerUnit} pts per ${currencySymbol}${ov.unitValue || "?"}`
                          : ov.isEnabled ? " · Using master rate" : ""}
                      </span>
                    </div>
                    {ov.open
                      ? <ChevronUp   className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {/* Expanded override form */}
                  {ov.open && (
                    <div className="px-5 pb-5 space-y-4 border-t border-border">
                      <div className="pt-4">
                        <button
                          onClick={() => setOverrides((p) => ({
                            ...p, [site.id]: { ...p[site.id], isEnabled: !p[site.id].isEnabled },
                          }))}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border w-full text-left
                            transition-all ${ov.isEnabled
                              ? "border-foreground bg-muted"
                              : "border-border hover:border-foreground/30"}`}>
                          <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0
                            ${ov.isEnabled ? "bg-foreground" : "bg-muted"}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm
                              transition-transform ${ov.isEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                          </div>
                          <p className="text-sm font-medium">
                            {ov.isEnabled ? "Loyalty enabled at this site" : "Loyalty disabled at this site"}
                          </p>
                        </button>
                      </div>
                      {ov.isEnabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Override points</Label>
                            <Input value={ov.pointsPerUnit}
                              onChange={(e) => setOverrides((p) => ({
                                ...p, [site.id]: { ...p[site.id], pointsPerUnit: e.target.value },
                              }))}
                              type="number" min="1" placeholder="Use master"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Override per {currencySymbol}</Label>
                            <Input value={ov.unitValue}
                              onChange={(e) => setOverrides((p) => ({
                                ...p, [site.id]: { ...p[site.id], unitValue: e.target.value },
                              }))}
                              type="number" min="0.01" step="0.01" placeholder="Use master"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                      )}
                      <Button size="sm" onClick={() => saveSiteOverride(site.id)} disabled={isPending}>
                        {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                        Save {site.name}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}