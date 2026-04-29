export const CORE_MODULE_KEYS = ["inventory", "billing", "loyalty"] as const;

export const CORE_PAGE_KEYS = [
  "inventory.stock",
  "inventory.adjust",
  "inventory.transfers",
  "billing.pos",
  "loyalty.customers",
  "loyalty.rewards",
] as const;

export function isCoreModule(key: string) {
  return (CORE_MODULE_KEYS as readonly string[]).includes(key);
}

export function isCorePage(key: string) {
  return (CORE_PAGE_KEYS as readonly string[]).includes(key);
}
