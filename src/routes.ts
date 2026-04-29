// src/routes.ts

export const ROUTES = {
  // ── AUTH ────────────────────────────────────────────────────────────────────
  auth: {
    login: "/login",
  },

  // ── MASTER DASHBOARD ────────────────────────────────────────────────────────
  dashboard: {
    home:        "/dashboard",
    sites:       "/dashboard/sites",
    site:        (siteId: string) => `/dashboard/sites/${siteId}`,
    settings:    "/dashboard/settings",
    staff:       "/dashboard/staff",
    staffBySite: (siteId: string) => `/dashboard/staff?site=${siteId}`,
    staffDetail: (subUserId: string) => `/dashboard/staff/${subUserId}`,
    profile:     "/dashboard/profile",
    manage: {
      root:       "/dashboard/manage",
      categories: "/dashboard/manage/categories",
      coupons:    "/dashboard/manage/coupons",
      tax:        "/dashboard/manage/tax",
      suppliers:  "/dashboard/manage/suppliers",
      products:   "/dashboard/manage/products",
      customers:  "/dashboard/manage/customers",
      loyalty: {
        root:    "/dashboard/manage/loyalty",
        rewards: "/dashboard/manage/loyalty/rewards",
        rules:   "/dashboard/manage/loyalty/rules",
      },
    },
    globalSettings: {
      general: "/dashboard/settings/general",
      loyalty: "/dashboard/settings/loyalty",
    },
  },

  // ── STAFF / PORTAL ──────────────────────────────────────────────────────────
  staff: {
    // Shell
    sitePicker: "/portal",
    site:       (siteId: string) => `/portal/${siteId}`,
    module:     (siteId: string, moduleKey: string) => `/portal/${siteId}/${moduleKey}`,
    page:       (siteId: string, moduleKey: string, pageKey: string) => `/portal/${siteId}/${moduleKey}/${pageKey}`,

    // Account
    profile:    (siteId: string) => `/portal/${siteId}/profile`,
    settings:   (siteId: string) => `/portal/${siteId}/settings/general`,
    loyalty:    (siteId: string) => `/portal/${siteId}/settings/loyalty`,

    // ── Inventory ────────────────────────────────────────────────────────────
    inventory: {
      root:       (siteId: string) => `/portal/${siteId}/inventory`,
      // Products
      products:   (siteId: string) => `/portal/${siteId}/inventory/products`,
      product:    (siteId: string, productId: string) => `/portal/${siteId}/inventory/products/${productId}`,
      newProduct: (siteId: string) => `/portal/${siteId}/inventory/products/new`,
      // Categories
      categories: (siteId: string) => `/portal/${siteId}/inventory/categories`,
      newCategory:(siteId: string) => `/portal/${siteId}/inventory/categories/new`,
      editCategory:(siteId: string, categoryId: string) => `/portal/${siteId}/inventory/categories/${categoryId}/edit`,
      // Stock
      stock:      (siteId: string) => `/portal/${siteId}/inventory/stock`,
      adjust:     (siteId: string) => `/portal/${siteId}/inventory/adjust`,
      history:    (siteId: string) => `/portal/${siteId}/inventory/history`,
      // Transfers
      transfers:       (siteId: string) => `/portal/${siteId}/inventory/transfers`,
      newTransfer:     (siteId: string) => `/portal/${siteId}/inventory/transfers/new`,
      transfer:        (siteId: string, transferId: string) => `/portal/${siteId}/inventory/transfers/${transferId}`,
    },

    // ── Customers ────────────────────────────────────────────────────────────
    customers:  (siteId: string) => `/portal/${siteId}/customers`,
    customer:   (siteId: string, customerId: string) => `/portal/${siteId}/customers/${customerId}`,
    newCustomer:(siteId: string) => `/portal/${siteId}/customers/new`,
    customerLoyalty: (siteId: string) => `/portal/${siteId}/customers/loyalty`,

    // ── Billing / POS ────────────────────────────────────────────────────────
    billing: {
      root: (siteId: string) => `/portal/${siteId}/billing`,
      pos:  (siteId: string) => `/portal/${siteId}/billing/pos`,
    },
    pos:        (siteId: string) => `/portal/${siteId}/billing/pos`,
    orders:     (siteId: string) => `/portal/${siteId}/billing`,
    coupons:    (siteId: string) => `/portal/${siteId}/sale/coupons`,
    newCoupon:  (siteId: string) => `/portal/${siteId}/sale/coupons/new`,
    editCoupon: (siteId: string, couponId: string) => `/portal/${siteId}/sale/coupons/${couponId}/edit`,

    // ── Settings ─────────────────────────────────────────────────────────────
    tax:        (siteId: string) => `/portal/${siteId}/settings/tax`,

    // ── Loyalty ──────────────────────────────────────────────────────────────
    loyaltyModule: {
      root:      (siteId: string) => `/portal/${siteId}/loyalty`,
      customers: (siteId: string) => `/portal/${siteId}/loyalty/customers`,
      rewards:   (siteId: string) => `/portal/${siteId}/loyalty/rewards`,
    },
  },
} as const;
