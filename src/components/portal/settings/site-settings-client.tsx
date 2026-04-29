"use client";

import { useState, useTransition } from "react";
import { toast }   from "sonner";
import {
  updateSiteSettingsAction,
  resetSiteLocaleAction,
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
import { Building2, Phone, Clock, MapPin, FileText, Loader2, ChevronDown, RotateCcw, Receipt, ToggleLeft, ToggleRight, Image } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface SiteSettingsData {
  id:                    string;
  name:                  string;
  address:               string | null;
  phone:                 string | null;
  currencyCode:          string;
  currencySymbol:        string;
  phoneCode:             string;
  timezone:              string;
  dateFormat:            string;
  countryOverridden:     boolean;
  taxInclusive:          boolean;
  taxRegistrationNumber: string | null;
  logoUrl:               string | null;
  receiptFooter:         string | null;
  language:              string;
}

interface MasterLocale {
  currencyCode:   string;
  currencySymbol: string;
  phoneCode:      string;
  timezone:       string;
  dateFormat:     string;
}

/* ── Country Picker (reused pattern) ────────────────────────── */

function CountryPicker({ value, onChange }: {
  value:    string;
  onChange: (country: Country) => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const selected = COUNTRIES.find((c) =>
    c.currencyCode === value || c.code === value
  );

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 h-11 px-4
          border border-border rounded-xl bg-background hover:border-foreground/30
          transition-colors text-left">
        <span className="text-sm text-muted-foreground">
          Change via country preset
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
                  className="w-full flex items-center justify-between px-3 py-2.5
                    rounded-xl text-left text-sm hover:bg-muted transition-colors">
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.currencySymbol} {c.currencyCode}
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

export function SiteSettingsClient({
  site,
  masterLocale,
}: {
  site:         SiteSettingsData;
  masterLocale: MasterLocale;
}) {
  const [isPending,   startTransition]  = useTransition();
  const [resetOpen,   setResetOpen]     = useState(false);

  // Form state
  const [name,          setName]          = useState(site.name);
  const [address,       setAddress]       = useState(site.address       ?? "");
  const [phone,         setPhone]         = useState(site.phone         ?? "");
  const [currencyCode,  setCurrencyCode]  = useState(site.currencyCode);
  const [currencySymbol,setCurrencySymbol]= useState(site.currencySymbol);
  const [phoneCode,     setPhoneCode]     = useState(site.phoneCode);
  const [timezone,      setTimezone]      = useState(site.timezone);
  const [dateFormat,    setDateFormat]    = useState(site.dateFormat);
  const [taxInclusive,  setTaxInclusive]  = useState(site.taxInclusive);
  const [taxRegNo,      setTaxRegNo]      = useState(site.taxRegistrationNumber ?? "");
  const [logoUrl,       setLogoUrl]       = useState(site.logoUrl       ?? "");
  const [receiptFooter, setReceiptFooter] = useState(site.receiptFooter ?? "");

  const isDifferentFromMaster =
    currencyCode   !== masterLocale.currencyCode   ||
    currencySymbol !== masterLocale.currencySymbol ||
    phoneCode      !== masterLocale.phoneCode      ||
    timezone       !== masterLocale.timezone       ||
    dateFormat     !== masterLocale.dateFormat;

  function handleCountryChange(country: Country) {
    if (country.code === "OTHER") return;
    setCurrencyCode(country.currencyCode);
    setCurrencySymbol(country.currencySymbol);
    setPhoneCode(country.phoneCode);
    setTimezone(country.timezones[0] ?? timezone);
    setDateFormat(country.dateFormat);
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name",                  name);
      fd.append("address",               address);
      fd.append("phone",                 phone);
      fd.append("currencyCode",          currencyCode);
      fd.append("currencySymbol",        currencySymbol);
      fd.append("phoneCode",             phoneCode);
      fd.append("timezone",              timezone);
      fd.append("dateFormat",            dateFormat);
      fd.append("taxInclusive",          String(taxInclusive));
      fd.append("taxRegistrationNumber", taxRegNo);
      fd.append("logoUrl",               logoUrl);
      fd.append("receiptFooter",         receiptFooter);
      fd.append("language",              "en");

      const res = await updateSiteSettingsAction(site.id, fd);
      if (res.success) toast.success("Site settings saved.");
      else toast.error(res.error);
    });
  }

  function handleReset() {
    startTransition(async () => {
      const res = await resetSiteLocaleAction(site.id);
      if (res.success) {
        setCurrencyCode(masterLocale.currencyCode);
        setCurrencySymbol(masterLocale.currencySymbol);
        setPhoneCode(masterLocale.phoneCode);
        setTimezone(masterLocale.timezone);
        setDateFormat(masterLocale.dateFormat);
        toast.success("Reset to master defaults.");
      } else {
        toast.error(res.error);
      }
      setResetOpen(false);
    });
  }

  const timezoneOptions = COUNTRIES
    .filter((c) => c.currencyCode === currencyCode)
    .flatMap((c) => c.timezones);

  return (
    <div className="max-w-2xl space-y-10">

      {/* ── Site identity ──────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Site Identity
        </h2>

        <div className="space-y-2">
          <Label>Site Name <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Branch" className="h-11 pl-11" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St, Mumbai" className="h-11 pl-11" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Phone</Label>
          <div className="flex gap-2">
            <div className="w-20 h-11 flex items-center justify-center rounded-xl
              border border-border bg-muted text-sm text-muted-foreground shrink-0">
              {phoneCode}
            </div>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210" className="h-11 flex-1" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Site Logo URL
            <span className="text-muted-foreground text-xs font-normal ml-1">
              overrides master logo on receipts
            </span>
          </Label>
          <div className="relative">
            <Image className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..." className="h-11 pl-11" />
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* ── Locale ─────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Currency & Locale
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Inherited from your master profile. Change here to override for this site only.
            </p>
          </div>
          {isDifferentFromMaster && (
            <button onClick={() => setResetOpen(true)} type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground
                hover:text-foreground transition-colors shrink-0 mt-0.5">
              <RotateCcw className="h-3.5 w-3.5" /> Reset to master
            </button>
          )}
        </div>

        {/* Country preset shortcut */}
        <div className="space-y-2">
          <Label>Apply Country Preset</Label>
          <CountryPicker value={currencyCode} onChange={handleCountryChange} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Currency Code</Label>
            <Input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}
              placeholder="INR" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Currency Symbol</Label>
            <Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="₹" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Phone Code</Label>
            <Input value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)}
              placeholder="+91" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Date Format</Label>
            <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background
                text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY/MM/DD">YYYY/MM/DD</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Timezone</Label>
          {timezoneOptions.length > 1 ? (
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background
                text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Kolkata" className="h-11 pl-11" />
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-muted/50 border border-border rounded-xl px-4 py-3
          flex items-center gap-6 text-sm flex-wrap">
          <span className="text-muted-foreground text-xs">Preview:</span>
          <span><span className="text-muted-foreground">Price </span>
            <strong>{currencySymbol}1,234.00</strong></span>
          <span><span className="text-muted-foreground">Phone </span>
            <strong>{phoneCode} 98765</strong></span>
          <span><span className="text-muted-foreground">Date </span>
            <strong>{dateFormat}</strong></span>
        </div>

        {isDifferentFromMaster && (
          <p className="text-xs text-warning dark:text-warning">
            ⚠ This site has custom locale settings — it won't be affected by master profile changes.
          </p>
        )}
      </section>

      <div className="border-t border-border" />

      {/* ── Tax ────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Tax
        </h2>

        {/* Tax inclusive toggle */}
        <button type="button" onClick={() => setTaxInclusive((p) => !p)}
          className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border
            text-left transition-all ${
            taxInclusive
              ? "border-foreground bg-muted"
              : "border-border hover:border-foreground/30"
          }`}>
          {taxInclusive
            ? <ToggleRight className="h-6 w-6 text-foreground shrink-0" />
            : <ToggleLeft  className="h-6 w-6 text-muted-foreground shrink-0" />}
          <div>
            <p className="text-sm font-semibold">
              {taxInclusive ? "Tax Inclusive Pricing" : "Tax Exclusive Pricing"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {taxInclusive
                ? "Prices shown to customers include tax. Receipt breaks it down."
                : "Tax added on top of item price at checkout."}
            </p>
          </div>
        </button>

        <div className="space-y-2">
          <Label>Tax Registration Number
            <span className="text-muted-foreground text-xs font-normal ml-1">
              shown on receipts
            </span>
          </Label>
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={taxRegNo} onChange={(e) => setTaxRegNo(e.target.value)}
              placeholder="e.g. 27AAPFU0939F1ZV" className="h-11 pl-11 font-mono" />
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* ── Receipt ────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Receipt
        </h2>
        <div className="space-y-2">
          <Label>Footer Text
            <span className="text-muted-foreground text-xs font-normal ml-1">
              printed at bottom of every receipt
            </span>
          </Label>
          <div className="relative">
            <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Thank you for your visit!"
              maxLength={200} className="h-11 pl-11" />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {receiptFooter.length}/200
          </p>
        </div>
      </section>

      <div className="border-t border-border" />

      <Button onClick={handleSubmit} disabled={isPending} className="w-full h-11">
        {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save Site Settings
      </Button>

      {/* Reset confirm */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to master defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset currency, phone code, timezone and date format back
              to your master profile settings. This site will then follow future
              master profile changes automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={isPending}
              className="rounded-xl">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}