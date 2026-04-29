"use server";

import { prisma } from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";

// ── Toggle Active / Inactive ──────────────────────────────────
export async function toggleSiteAction(siteId: string, isActive: boolean) {
  const { masterProfile, session } = await getMasterProfile();

  const site = await prisma.site.findFirst({
    where: { id: siteId, masterProfileId: masterProfile.id },
  });
  if (!site) return;

  await prisma.site.update({
    where: { id: siteId },
    data:  { isActive },
  });

  prisma.auditLog.create({
    data: {
      masterUserId: session.user.id,
      siteId,
      action:     isActive ? "SITE_ACTIVATED" : "SITE_DEACTIVATED",
      module:     "sites",
      recordId:   siteId,
      recordType: "Site",
    },
  }).catch(console.error);
}

// ── Delete Site ───────────────────────────────────────────────
export async function deleteSiteAction(siteId: string) {
  const { masterProfile, session } = await getMasterProfile();

  const site = await prisma.site.findFirst({
    where: { id: siteId, masterProfileId: masterProfile.id },
  });
  if (!site) return;

  // Audit log BEFORE delete — site will be gone after
  await prisma.auditLog.create({
    data: {
      masterUserId: session.user.id,
      siteId,
      action:     "SITE_DELETED",
      module:     "sites",
      recordId:   siteId,
      recordType: "Site",
      metadata:   { siteName: site.name },
    },
  });

  await prisma.site.delete({ where: { id: siteId } });
}