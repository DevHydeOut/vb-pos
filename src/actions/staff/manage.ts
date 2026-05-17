"use server";

import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { hash }             from "@node-rs/argon2";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

// Update Name/Username
export async function updateSubUserAction(formData: FormData): Promise<ActionResult> {
  const { masterProfile } = await getMasterProfile();
  const subUserId = formData.get("subUserId") as string;
  const name      = (formData.get("name") as string).trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const username  = (formData.get("username") as string).toLowerCase().trim();

  if (!name || !username) return { success: false, error: "Name and username are required" };
  if (description.length > 300) return { success: false, error: "Description must be 300 characters or less" };
  if (!/^[a-z0-9_]+$/.test(username)) return { success: false, error: "Username: only lowercase letters, numbers, underscores" };

  const subUser = await prisma.subUser.findFirst({
    where: { id: subUserId, masterProfileId: masterProfile.id },
  });
  if (!subUser) return { success: false, error: "Staff member not found" };

  const taken = await prisma.subUser.findFirst({
    where: { masterProfileId: masterProfile.id, username, id: { not: subUserId } },
  });
  if (taken) return { success: false, error: "Username already taken" };

  await prisma.subUser.update({ where: { id: subUserId }, data: { name, username, description: description || null } });
  return { success: true };
}

// Reset Password
export async function resetSubUserPasswordAction(formData: FormData): Promise<ActionResult> {
  const { masterProfile, session } = await getMasterProfile();
  const subUserId   = formData.get("subUserId") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!newPassword || newPassword.length < 6)
    return { success: false, error: "Password must be at least 6 characters" };

  const subUser = await prisma.subUser.findFirst({
    where: { id: subUserId, masterProfileId: masterProfile.id },
  });
  if (!subUser) return { success: false, error: "Staff member not found" };

  const hashedPassword = await hash(newPassword);
  await prisma.subUser.update({ where: { id: subUserId }, data: { password: hashedPassword } });

  // Kill all active sessions — force re-login with new password
  await prisma.staffSession.deleteMany({ where: { subUserId } });

  const firstSite = await prisma.subUserSite.findFirst({ where: { subUserId } });
  prisma.auditLog.create({
    data: {
      masterUserId: session.user.id,
      siteId:       firstSite?.siteId ?? "",
      action:       "SUBUSER_PASSWORD_RESET",
      module:       "staff",
      recordId:     subUserId,
      recordType:   "SubUser",
    },
  }).catch(console.error);

  return { success: true };
}

// Toggle Active/Inactive
export async function toggleSubUserAction(subUserId: string, isActive: boolean): Promise<ActionResult> {
  const { masterProfile } = await getMasterProfile();

  const subUser = await prisma.subUser.findFirst({
    where: { id: subUserId, masterProfileId: masterProfile.id },
  });
  if (!subUser) return { success: false, error: "Staff member not found" };

  await prisma.subUser.update({ where: { id: subUserId }, data: { isActive } });

  // Deactivating — kill sessions immediately
  if (!isActive) {
    await prisma.staffSession.deleteMany({ where: { subUserId } });
  }

  return { success: true };
}

// Update Permissions
type PermissionInput = { siteId: string; moduleIds: string[]; pageIds: string[] };

export async function updateSubUserPermissionsAction(
  subUserId: string,
  permissions: PermissionInput[]
): Promise<ActionResult> {
  const { masterProfile } = await getMasterProfile();

  const subUser = await prisma.subUser.findFirst({
    where: { id: subUserId, masterProfileId: masterProfile.id },
  });
  if (!subUser) return { success: false, error: "Staff member not found" };

  await prisma.$transaction(async (tx) => {
    const existingSites = await tx.subUserSite.findMany({ where: { subUserId } });
    for (const s of existingSites) {
      await tx.permission.deleteMany({ where: { subUserSiteId: s.id } });
    }
    await tx.subUserSite.deleteMany({ where: { subUserId } });

    for (const [i, perm] of permissions.entries()) {
      const site = await tx.site.findFirst({
        where: { id: perm.siteId, masterProfileId: masterProfile.id },
      });
      if (!site) continue;

      const subUserSite = await tx.subUserSite.create({
        data: { subUserId, siteId: perm.siteId, isDefault: i === 0 },
      });

      for (const moduleId of perm.moduleIds) {
        await tx.permission.create({
          data: { subUserSiteId: subUserSite.id, moduleId, pageId: null },
        });
      }

      for (const pageId of perm.pageIds) {
        const page = await tx.page.findUnique({ where: { id: pageId } });
        if (!page) continue;
        await tx.permission.create({
          data: { subUserSiteId: subUserSite.id, moduleId: page.moduleId, pageId },
        });
      }
    }
  });

  return { success: true };
}

// Delete Sub User
export async function deleteSubUserAction(subUserId: string): Promise<ActionResult> {
  const { masterProfile, session } = await getMasterProfile();

  const subUser = await prisma.subUser.findFirst({
    where: { id: subUserId, masterProfileId: masterProfile.id },
  });
  if (!subUser) return { success: false, error: "Staff member not found" };

  const firstSite = await prisma.subUserSite.findFirst({ where: { subUserId } });

  await prisma.staffSession.deleteMany({ where: { subUserId } });

  await prisma.auditLog.create({
    data: {
      masterUserId: session.user.id,
      siteId:       firstSite?.siteId ?? "",
      action:       "SUBUSER_DELETED",
      module:       "staff",
      recordId:     subUserId,
      recordType:   "SubUser",
      metadata:     { username: subUser.username },
    },
  });

  await prisma.subUser.delete({ where: { id: subUserId } });
  return { success: true };
}
