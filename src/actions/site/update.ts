"use server";

import { prisma } from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { createSiteSchema } from "@/lib/validators/site";

type UpdateResult =
  | { success: true }
  | { success: false; error: string };

export async function updateSiteAction(formData: FormData): Promise<UpdateResult> {
    const { masterProfile, session } = await getMasterProfile();

    const siteId = formData.get("siteId") as string;
    if (!siteId) return { success: false, error: "Site ID missing" };

    const raw = {
        name:      formData.get("name") as string,
        address:   formData.get("address") as string,
        phone:     formData.get("phone") as string,
        taxNumber: formData.get("taxNumber") as string,
    };

    const parsed = createSiteSchema.safeParse(raw);
    if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };  // ✅
    }

    // Verify ownership
    const site = await prisma.site.findFirst({
        where: { id: siteId, masterProfileId: masterProfile.id },
    });
    if (!site) return { success: false, error: "Site not found" };

    await prisma.site.update({
        where: { id: siteId },
        data: {
        name:      parsed.data.name,
        address:   parsed.data.address   || null,
        phone:     parsed.data.phone     || null,
        taxNumber: parsed.data.taxNumber || null,
        },
    });

  prisma.auditLog.create({
    data: {
      masterUserId: session.user.id,
      siteId,
      action:     "SITE_UPDATED",
      module:     "sites",
      recordId:   siteId,
      recordType: "Site",
    },
  }).catch(console.error);

  return { success: true };
}