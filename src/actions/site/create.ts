"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/actions/auth/master";
import { createSiteSchema } from "@/lib/validators/site";

type ActionResult =
  | { success: true; siteName: string }
  | { success: false; error: string };

export async function createSiteAction(
  formData: FormData
): Promise<ActionResult> {
  // 1. Verify session
    const session = await getSession();
    if (!session) return { success: false, error: "Not authenticated" };

    // 2. Parse and validate form data
    const raw = {
      name:      formData.get("name") as string,
      address:   formData.get("address") as string,
      phone:     formData.get("phone") as string,
      taxNumber: formData.get("taxNumber") as string,
    };

  const parsed = createSiteSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0].message;  // ✅ issues not errors
    return { success: false, error: firstError };
  }

  // 3. Get master profile
  const masterProfile = await prisma.masterProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!masterProfile) return { success: false, error: "Account not found" };

  // 4. Create the site
  const site = await prisma.site.create({
    data: {
      name:           parsed.data.name,
      address:        parsed.data.address || null,
      phone:          parsed.data.phone || null,
      taxNumber:      parsed.data.taxNumber || null,
      masterProfileId: masterProfile.id,
    },
  });

  // 5. Audit log — fire and forget
  prisma.auditLog.create({
    data: {
      masterUserId: session.user.id,
      siteId:       site.id,
      action:       "SITE_CREATED",
      module:       "sites",
      recordId:     site.id,
      recordType:   "Site",
    },
  }).catch(console.error);

  return { success: true, siteName: site.name };
}
