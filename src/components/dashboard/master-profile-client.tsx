"use client";

import { useState, useTransition, useEffect } from "react";
import { toast }   from "sonner";
import {
  updateMasterProfileAction,
  cascadeLocaleToSitesAction,
  uploadMasterLogoAction,
} from "@/actions/profile";
import { COUNTRIES, getCountry, type Country } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, Globe, Phone, FileText, Clock,
  Loader2, ChevronDown, Check, BadgeCheck,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface MasterProfileData {
  businessName:          string | null;
  businessLogoUrl:       string | null;
  taxRegistrationNumber: string | null;
  countryCode:           string | null;
  currencyCode:          string;
  currencySymbol:        string;
  phoneCode:             string;
  timezone:              string;
  dateFormat:            string;
  phone:                 string | null;
  profileComplete:       boolean;
}

/* ── Country Picker ─────────────────────────────────────────── */

function CountryPicker({ value, onChange }: {
  value:    string;
  onChange: (country: Country) => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const selected = getCountry(value);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 h-11 px-4
          border border-border rounded-xl bg-background hover:border-foreground/30
          transition-colors text-left">
        <span className="text-sm">
          {selected ? selected.name : "Select country"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-background
            border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-border">
              <Input autoFocus placeholder="Search country..."
                value={query} onChange={(e) => setQuery(e.target.value)}
                className="h-9 text-sm" />
            </div>
            <div className="max-h-56 overflow-y-auto p-2 space-y-0.5">
              {filtered.map((c) => (
                <button key={c.code} type="button"
                  onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5
                    rounded-xl text-left text-sm transition-colors ${
                    value === c.code
                      ? "bg-foreground text-background"
                      : "hover:bg-muted"
                  }`}>
                  <span>{c.name}</span>
                  <span className={`text-xs ${value === c.code ? "text-background/70" : "text-muted-foreground"}`}>
                    {c.currencyCode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function MasterProfileClient({ profile }: { profile: MasterProfileData }) {
  const [isPending,  startTransition]  = useTransition();
  const [cascadeOpen, setCascadeOpen]  = useState(false);
  const [siteCount,   setSiteCount]    = useState(0);

  // Form state
  const [businessName,  setBusinessName]  = useState(profile.businessName  ?? "");
  const [phone,         setPhone]         = useState(profile.phone         ?? "");
  const [taxRegNo,      setTaxRegNo]      = useState(profile.taxRegistrationNumber ?? "");
  const [countryCode,   setCountryCode]   = useState(profile.countryCode   ?? "");
  const [currencyCode,  setCurrencyCode]  = useState(profile.currencyCode);
  const [currencySymbol,setCurrencySymbol]= useState(profile.currencySymbol);
  const [phoneCode,     setPhoneCode]     = useState(profile.phoneCode);
  const [timezone,      setTimezone]      = useState(profile.timezone);
  const [dateFormat,    setDateFormat]    = useState(profile.dateFormat);

  // When country changes, auto-fill all locale fields
  function handleCountryChange(country: Country) {
    setCountryCode(country.code);
    if (country.code === "OTHER") return; // manual entry
    setCurrencyCode(country.currencyCode);
    setCurrencySymbol(country.currencySymbol);
    setPhoneCode(country.phoneCode);
    setTimezone(country.timezones[0] ?? "UTC");
    setDateFormat(country.dateFormat);
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("businessName",          businessName);
      fd.append("phone",                 phone);
      fd.append("taxRegistrationNumber", taxRegNo);
      fd.append("countryCode",           countryCode);
      fd.append("currencyCode",          currencyCode);
      fd.append("currencySymbol",        currencySymbol);
      fd.append("phoneCode",             phoneCode);
      fd.append("timezone",              timezone);
      fd.append("dateFormat",            dateFormat);

      const res = await updateMasterProfileAction(fd);
      if (!res.success) { toast.error(res.error); return; }

      if (res.cascadeNeeded && res.siteCount && res.siteCount > 0) {
        setSiteCount(res.siteCount);
        setCascadeOpen(true);
      } else {
        toast.success("Profile updated.");
      }
    });
  }

  function handleCascade(confirm: boolean) {
    setCascadeOpen(false);
    if (!confirm) { toast.success("Profile updated. Sites not changed."); return; }
    startTransition(async () => {
      const res = await cascadeLocaleToSitesAction();
      if (res.success) toast.success(`Profile updated and applied to ${siteCount} site${siteCount > 1 ? "s" : ""}.`);
      else toast.error(res.error);
    });
  }

  const selectedCountry = getCountry(countryCode);
  const isOther         = countryCode === "OTHER";

  return (
    <div className="max-w-2xl space-y-10">

      {/* Setup banner */}
      {!profile.profileComplete && (
        <div className="flex items-start gap-3 bg-foreground text-background rounded-2xl px-5 py-4">
          <BadgeCheck className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Complete your profile</p>
            <p className="text-xs opacity-70 mt-0.5">
              Adding your country and business details enables currency symbols,
              tax presets and phone codes across all your sites automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── Business identity ──────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Business Identity
        </h2>

        <div className="space-y-2">
          <Label>Business Name <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Main Store Retail" className="h-11 pl-11" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone</Label>
            <div className="flex gap-2">
              <div className="w-20 h-11 flex items-center justify-center rounded-xl
                border border-border bg-muted text-sm text-muted-foreground shrink-0">
                {phoneCode || "+??"}
              </div>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210" className="h-11 flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax Registration No.
              <span className="text-muted-foreground text-xs font-normal ml-1">
                GST / VAT / EIN
              </span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={taxRegNo} onChange={(e) => setTaxRegNo(e.target.value)}
                placeholder="e.g. 27AAPFU0939F1ZV" className="h-11 pl-11 font-mono" />
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* ── Country & locale ───────────────────────────────── */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Country & Locale
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Selecting a country auto-fills currency, phone code, timezone and date format.
            These cascade to all new sites you create.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Country <span className="text-destructive">*</span></Label>
          <CountryPicker value={countryCode} onChange={handleCountryChange} />
        </div>

        {/* Auto-filled fields — editable if "Other" */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Currency Code</Label>
            <Input value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              disabled={!isOther} placeholder="INR" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Currency Symbol</Label>
            <Input value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              disabled={!isOther} placeholder="₹" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Phone Code</Label>
            <Input value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              disabled={!isOther} placeholder="+91" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Date Format</Label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background
                text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY/MM/DD">YYYY/MM/DD</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label>Timezone</Label>
          {selectedCountry && !isOther && selectedCountry.timezones.length > 1 ? (
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background
                text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
              {selectedCountry.timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!isOther && !!selectedCountry}
                placeholder="Asia/Kolkata" className="h-11 pl-11" />
            </div>
          )}
        </div>

        {/* Preview */}
        {currencySymbol && (
          <div className="bg-muted/50 border border-border rounded-xl px-4 py-3
            flex items-center gap-6 text-sm flex-wrap">
            <span className="text-muted-foreground text-xs">Preview:</span>
            <span><span className="text-muted-foreground">Currency </span>
              <strong>{currencySymbol}1,234.00</strong></span>
            <span><span className="text-muted-foreground">Phone </span>
              <strong>{phoneCode} 9876543210</strong></span>
            <span><span className="text-muted-foreground">Date </span>
              <strong>{dateFormat}</strong></span>
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      <Button onClick={handleSubmit} disabled={isPending} className="w-full h-11">
        {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save Profile
      </Button>

      {/* Cascade confirmation */}
      <AlertDialog open={cascadeOpen} onOpenChange={setCascadeOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply to existing sites?</AlertDialogTitle>
            <AlertDialogDescription>
              You have <strong>{siteCount} site{siteCount > 1 ? "s" : ""}</strong> that
              haven't been manually customised. Do you want to update their currency,
              timezone and date format to match your new settings?
              <br /><br />
              Sites you've already customised individually won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => handleCascade(false)}>
              No, keep sites as they are
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={() => handleCascade(true)}>
              Yes, update {siteCount} site{siteCount > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
