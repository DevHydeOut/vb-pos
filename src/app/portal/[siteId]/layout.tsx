// src/app/(structure)/portal/[siteId]/layout.tsx

import { redirect }        from "next/navigation";
import { getStaffSession }  from "@/actions/auth/staff";
import { getMasterProfile } from "@/data/master";
import { prisma }           from "@/lib/prisma";
import { ROUTES }           from "@/routes";
import { PortalHeader }     from "@/components/portal/portal-header";
import { PortalNav }        from "@/components/portal/portal-nav";
import { isCoreModule, isCorePage } from "@/config/app-modules";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params:   Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);

  if (!staffSession && !masterResult) redirect(ROUTES.auth.login);

  const isMaster = !!masterResult && !staffSession;

  let siteName:       string;
  let masterProfileId: string;
  let otherSites:     { siteId: string; name: string }[] = [];
  let user:           { name: string; username: string; isMaster: boolean };
  let navModules:     { key: string; label: string; pages: { id: string; key: string; label: string }[] }[] = [];

  if (isMaster) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult!.masterProfile.id },
    });
    siteName        = site?.name ?? "Site";
    masterProfileId = masterResult!.masterProfile.id;
    user            = { name: "Admin", username: "admin", isMaster: true };

    const allModules = await prisma.module.findMany({
      where: { key: { in: ["inventory", "billing", "loyalty"] } },
      orderBy: { sortOrder: "asc" },
      include: { pages: { orderBy: { sortOrder: "asc" } } },
    });
    navModules = allModules.map((m) => ({
      key:   m.key,
      label: m.label,
      pages: m.pages
        .filter((p) => isCorePage(p.key))
        .map((p) => ({ id: p.id, key: p.key, label: p.label })),
    }));
  } else {
    const subUser = staffSession!.subUser;

    siteName        = subUser.sites.find((s) => s.siteId === siteId)?.site.name ?? "Site";
    masterProfileId = subUser.sites.find((s) => s.siteId === siteId)?.site.masterProfileId ?? "";
    otherSites      = subUser.sites
      .filter((s) => s.siteId !== siteId)
      .map((s) => ({ siteId: s.siteId, name: s.site.name }));
    user = {
      name:     subUser.name ?? subUser.username,
      username: subUser.username,
      isMaster: false,
    };

    const subUserSite = await prisma.subUserSite.findUnique({
      where:   { subUserId_siteId: { subUserId: subUser.id, siteId } },
      include: { permissions: { include: { module: true, page: true } } },
    });

    if (subUserSite) {
      const moduleMap = new Map<string, typeof navModules[0]>();

      for (const perm of subUserSite.permissions) {
        if (!perm.module || !isCoreModule(perm.module.key)) continue;
        if (!moduleMap.has(perm.module.id)) {
          moduleMap.set(perm.module.id, {
            key: perm.module.key, label: perm.module.label, pages: [],
          });
        }
        if (perm.page && isCorePage(perm.page.key)) {
          moduleMap.get(perm.module.id)!.pages.push({
            id: perm.page.id, key: perm.page.key, label: perm.page.label,
          });
        }
      }

      const moduleIdsNeedingAllPages = subUserSite.permissions
        .filter((p) => p.module && !p.page)
        .map((p) => p.module!.id);

      if (moduleIdsNeedingAllPages.length > 0) {
        const fullModules = await prisma.module.findMany({
          where:   { id: { in: moduleIdsNeedingAllPages }, key: { in: ["inventory", "billing", "loyalty"] } },
          orderBy: { sortOrder: "asc" },
          include: { pages: { orderBy: { sortOrder: "asc" } } },
        });
        for (const mod of fullModules) {
          if (moduleMap.has(mod.id)) {
            moduleMap.get(mod.id)!.pages = mod.pages
              .filter((p) => isCorePage(p.key))
              .map((p) => ({ id: p.id, key: p.key, label: p.label }));
          }
        }
      }

      navModules = Array.from(moduleMap.values());
    }
  }

  // ── Fetch real notifications ──────────────────────────────
  // These will return [] / 0 until migration is run (safe to deploy before migrating)
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where:   { siteId, masterProfileId },
      orderBy: { createdAt: "desc" },
      take:    20,
    }).catch(() => []),
    prisma.notification.count({
      where: { siteId, masterProfileId, isRead: false },
    }).catch(() => 0),
  ]);

  // ── Pending incoming transfer count (for nav badge) ────────
  const pendingTransferCount = await prisma.stockTransfer.count({
    where: { toSiteId: siteId, masterProfileId, status: "PENDING" },
  }).catch(() => 0);

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <PortalHeader
        siteId={siteId}
        siteName={siteName}
        otherSites={otherSites}
        user={user}
        notifications={notifications}
        unreadCount={unreadCount}
      />

      {/*
        overflow-y-auto + pb-24 = scrollable content area with space for the floating nav.
        Stock-entry uses fixed positioning so it breaks out of this scroll naturally.
      */}
      <div className="flex-1 overflow-y-auto pb-24 min-h-0">
        {children}
      </div>

      <PortalNav
        siteId={siteId}
        modules={navModules}
        pendingTransferCount={pendingTransferCount}
      />
    </div>
  );
}
