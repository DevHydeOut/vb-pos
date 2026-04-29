// src/lib/countries.ts
// Major countries with full locale data.
// To add more: copy the pattern, add one object to COUNTRIES array.
// "Other" always stays last — used when country isn't listed.

export interface Country {
  code:           string;   // ISO 3166-1 alpha-2
  name:           string;
  currencyCode:   string;   // ISO 4217
  currencySymbol: string;
  phoneCode:      string;   // e.g. "+91"
  timezones:      string[]; // IANA timezone identifiers
  dateFormat:     string;   // "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD"
  taxPreset:      string | null; // matches key in COUNTRY_PRESETS in tax-group-list-client
}

export const COUNTRIES: Country[] = [
  {
    code:           "US",
    name:           "United States",
    currencyCode:   "USD",
    currencySymbol: "$",
    phoneCode:      "+1",
    timezones:      ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"],
    dateFormat:     "MM/DD/YYYY",
    taxPreset:      null, // US sales tax varies by state — set manually
  },
  {
    code:           "CA",
    name:           "Canada",
    currencyCode:   "CAD",
    currencySymbol: "CA$",
    phoneCode:      "+1",
    timezones:      ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Halifax"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      null,
  },
  {
    code:           "GB",
    name:           "United Kingdom",
    currencyCode:   "GBP",
    currencySymbol: "£",
    phoneCode:      "+44",
    timezones:      ["Europe/London"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      "UK (VAT)",
  },
  {
    code:           "IN",
    name:           "India",
    currencyCode:   "INR",
    currencySymbol: "₹",
    phoneCode:      "+91",
    timezones:      ["Asia/Kolkata"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      "India (GST)",
  },
  {
    code:           "AU",
    name:           "Australia",
    currencyCode:   "AUD",
    currencySymbol: "A$",
    phoneCode:      "+61",
    timezones:      ["Australia/Sydney", "Australia/Melbourne", "Australia/Perth", "Australia/Brisbane"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      "Australia (GST)",
  },
  {
    code:           "NZ",
    name:           "New Zealand",
    currencyCode:   "NZD",
    currencySymbol: "NZ$",
    phoneCode:      "+64",
    timezones:      ["Pacific/Auckland"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      null,
  },
  {
    code:           "FR",
    name:           "France",
    currencyCode:   "EUR",
    currencySymbol: "€",
    phoneCode:      "+33",
    timezones:      ["Europe/Paris"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      "EU (VAT)",
  },
  {
    code:           "DE",
    name:           "Germany",
    currencyCode:   "EUR",
    currencySymbol: "€",
    phoneCode:      "+49",
    timezones:      ["Europe/Berlin"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      "EU (VAT)",
  },
  {
    code:           "RU",
    name:           "Russia",
    currencyCode:   "RUB",
    currencySymbol: "₽",
    phoneCode:      "+7",
    timezones:      ["Europe/Moscow", "Asia/Yekaterinburg", "Asia/Novosibirsk", "Asia/Vladivostok"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      null,
  },
  {
    code:           "AE",
    name:           "UAE",
    currencyCode:   "AED",
    currencySymbol: "د.إ",
    phoneCode:      "+971",
    timezones:      ["Asia/Dubai"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      "UAE (VAT)",
  },
  {
    code:           "SA",
    name:           "Saudi Arabia",
    currencyCode:   "SAR",
    currencySymbol: "﷼",
    phoneCode:      "+966",
    timezones:      ["Asia/Riyadh"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      null,
  },
  {
    code:           "SG",
    name:           "Singapore",
    currencyCode:   "SGD",
    currencySymbol: "S$",
    phoneCode:      "+65",
    timezones:      ["Asia/Singapore"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      null,
  },
  {
    code:           "JP",
    name:           "Japan",
    currencyCode:   "JPY",
    currencySymbol: "¥",
    phoneCode:      "+81",
    timezones:      ["Asia/Tokyo"],
    dateFormat:     "YYYY/MM/DD",
    taxPreset:      null,
  },
  {
    code:           "CN",
    name:           "China",
    currencyCode:   "CNY",
    currencySymbol: "¥",
    phoneCode:      "+86",
    timezones:      ["Asia/Shanghai"],
    dateFormat:     "YYYY/MM/DD",
    taxPreset:      null,
  },
  {
    code:           "ZA",
    name:           "South Africa",
    currencyCode:   "ZAR",
    currencySymbol: "R",
    phoneCode:      "+27",
    timezones:      ["Africa/Johannesburg"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      null,
  },
  {
    code:           "BR",
    name:           "Brazil",
    currencyCode:   "BRL",
    currencySymbol: "R$",
    phoneCode:      "+55",
    timezones:      ["America/Sao_Paulo", "America/Manaus"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      null,
  },
  {
    code:           "MX",
    name:           "Mexico",
    currencyCode:   "MXN",
    currencySymbol: "MX$",
    phoneCode:      "+52",
    timezones:      ["America/Mexico_City", "America/Cancun"],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      null,
  },
  // ── "Other" must always stay last ──────────────────────────
  {
    code:           "OTHER",
    name:           "Other",
    currencyCode:   "",
    currencySymbol: "",
    phoneCode:      "",
    timezones:      [],
    dateFormat:     "DD/MM/YYYY",
    taxPreset:      null,
  },
];

/* ── Lookup helpers ─────────────────────────────────────────── */

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function getCountryByName(name: string): Country | undefined {
  return COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

// Returns the primary (first) timezone for a country
export function getPrimaryTimezone(countryCode: string): string {
  return getCountry(countryCode)?.timezones[0] ?? "UTC";
}

// All timezones as a flat list for a select dropdown
export function getTimezones(countryCode: string): string[] {
  return getCountry(countryCode)?.timezones ?? [];
}