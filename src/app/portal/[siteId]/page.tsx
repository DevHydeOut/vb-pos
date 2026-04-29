import { redirect }          from "next/navigation";
import { notFound }           from "next/navigation";
import { getStaffSession }    from "@/actions/auth/staff";
import { staffSignOutAction } from "@/actions/auth/staff";
import { getMasterProfile }   from "@/data/master";
import { signOutAction }      from "@/actions/auth/master";
import { prisma }             from "@/lib/prisma";
import { ROUTES }             from "@/routes";
import { ModuleCards }        from "@/components/staff/module-cards";
import { Button }             from "@/components/ui/button";
import { Badge }              from "@/components/ui/badge";
import { Building2, ChevronDown, ArrowLeft , Package} from "lucide-react";
import Link                   from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { isCoreModule, isCorePage } from "@/config/app-modules";

export default async function StaffSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // ── Detect who is visiting ───────────────────────────────
  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);

  if (!staffSession && !masterResult) redirect(ROUTES.auth.login);

  const isMaster = !!masterResult && !staffSession;

  // ── Site + module data ───────────────────────────────────
  let siteName:    string;
  let modules:     { id: string; key: string; label: string; sortOrder: number; pages: { id: string; key: string; label: string }[] }[];
  let displayName: string;
  let otherSites:  { siteId: string; site: { name: string } }[] = [];

  if (isMaster) {
    // Master — verify they own this site
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult!.masterProfile.id },
    });
    if (!site || !site.isActive) notFound();

    siteName    = site.name;
    displayName = masterResult!.session.user.name ?? "Owner";

    // Master sees ALL modules
    const allModules = await prisma.module.findMany({
      where: { key: { in: ["inventory", "billing", "loyalty"] } },
      orderBy: { sortOrder: "asc" },
      include: { pages: { orderBy: { sortOrder: "asc" } } },
    });

    modules = allModules.map((mod) => ({
      id:        mod.id,
      key:       mod.key,
      label:     mod.label,
      sortOrder: mod.sortOrder,
      pages:     mod.pages
        .filter((p) => isCorePage(p.key))
        .map((p) => ({ id: p.id, key: p.key, label: p.label })),
    }));

    // Other sites for switching
    const sites = await prisma.site.findMany({
      where:   { masterProfileId: masterResult!.masterProfile.id, isActive: true, id: { not: siteId } },
      orderBy: { name: "asc" },
    });
    otherSites = sites.map((s) => ({ siteId: s.id, site: { name: s.name } }));

  } else {
    // Staff — verify site assignment
    const subUserSite = await prisma.subUserSite.findUnique({
      where: {
        subUserId_siteId: { subUserId: staffSession!.subUser.id, siteId },
      },
      include: {
        site: true,
        permissions: {
          include: { module: true, page: true },
        },
      },
    });
    if (!subUserSite || !subUserSite.site.isActive) notFound();

    siteName    = subUserSite.site.name;
    displayName = staffSession!.subUser.name ?? staffSession!.subUser.username;

    // Build modules from permissions
    // A permission row with page=null means full module access → load all pages for that module
    const moduleMap  = new Map<string, typeof modules[number]>();
    const fullAccessModuleIds: string[] = [];

    for (const perm of subUserSite.permissions) {
      if (!perm.module || !isCoreModule(perm.module.key)) continue;
      if (!moduleMap.has(perm.module.id)) {
        moduleMap.set(perm.module.id, {
          id:        perm.module.id,
          key:       perm.module.key,
          label:     perm.module.label,
          sortOrder: perm.module.sortOrder,
          pages:     [],
        });
      }
      if (!perm.page) {
        // Full module access — mark for bulk page load
        if (!fullAccessModuleIds.includes(perm.module.id)) {
          fullAccessModuleIds.push(perm.module.id);
        }
      } else if (isCorePage(perm.page.key)) {
        // Specific page access
        moduleMap.get(perm.module.id)!.pages.push({
          id:    perm.page.id,
          key:   perm.page.key,
          label: perm.page.label,
        });
      }
    }

    // For full-access modules, fetch all their pages in one query
    if (fullAccessModuleIds.length > 0) {
      const fullModules = await prisma.module.findMany({
        where:   { id: { in: fullAccessModuleIds }, key: { in: ["inventory", "billing", "loyalty"] } },
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

    modules    = Array.from(moduleMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    otherSites = staffSession!.subUser.sites.filter((s) => s.siteId !== siteId);
  }

  return (
      <main className="min-h-full px-6 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-muted-foreground">
            Good {getGreeting()}, {displayName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isMaster
              ? "You have full access to all modules."
              : "Select a module to get started."
            }
          </p>
        </div>

        {modules.length === 0 ? (
          <div className="border-2 border-dashed rounded-2xl p-16 text-center space-y-2">
            <p className="font-medium text-muted-foreground">No modules assigned yet</p>
            <p className="text-sm text-muted-foreground">
              Ask your administrator to assign module permissions.
            </p>
          </div>
        ) : (
          <ModuleCards modules={modules} siteId={siteId} />
        )}
      </main>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
