export const ROUTES = {
  auth: {
    login: "/login",
  },

  dashboard: {
    home: "/dashboard",
    sites: "/dashboard/sites",
    site: (siteId: string) => `/dashboard/sites/${siteId}`,
    staff: "/dashboard/staff",
    staffBySite: (siteId: string) => `/dashboard/staff?site=${siteId}`,
    staffDetail: (subUserId: string) => `/dashboard/staff/${subUserId}`,
    profile: "/dashboard/profile",
    manage: {
      root: "/dashboard/manage",
      products: "/dashboard/manage/products",
      productImport: "/dashboard/manage/products/import",
      stock: "/dashboard/manage/stock",
      reports: "/dashboard/manage/reports",
      loyalty: {
        root: "/dashboard/manage/loyalty",
      },
    },
    globalSettings: {
      loyalty: "/dashboard/settings/loyalty",
    },
  },

  staff: {
    sitePicker: "/portal",
    site: (siteId: string) => `/portal/${siteId}`,
    module: (siteId: string, moduleKey: string) => `/portal/${siteId}/${moduleKey}`,
    page: (siteId: string, moduleKey: string, pageKey: string) => `/portal/${siteId}/${moduleKey}/${pageKey}`,
    profile: (siteId: string) => `/portal/${siteId}/profile`,

    inventory: {
      root: (siteId: string) => `/portal/${siteId}/inventory`,
      products: (siteId: string) => `/portal/${siteId}/inventory/products`,
      product: (siteId: string, productId: string) => `/portal/${siteId}/inventory/products/${productId}`,
      newProduct: (siteId: string) => `/portal/${siteId}/inventory/products/new`,
      stock: (siteId: string) => `/portal/${siteId}/inventory/stock`,
      adjust: (siteId: string) => `/portal/${siteId}/inventory/adjust`,
      transfers: (siteId: string) => `/portal/${siteId}/inventory/transfers`,
      newTransfer: (siteId: string) => `/portal/${siteId}/inventory/transfers/new`,
    },

    billing: {
      root: (siteId: string) => `/portal/${siteId}/billing`,
      pos: (siteId: string) => `/portal/${siteId}/billing/pos`,
      analytics: (siteId: string) => `/portal/${siteId}/billing/analytics`,
    },
    pos: (siteId: string) => `/portal/${siteId}/billing/pos`,

    loyaltyModule: {
      root: (siteId: string) => `/portal/${siteId}/loyalty`,
      customers: (siteId: string) => `/portal/${siteId}/loyalty/customers`,
      rewards: (siteId: string) => `/portal/${siteId}/loyalty/rewards`,
    },
  },
} as const;
