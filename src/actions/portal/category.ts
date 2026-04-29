"use server";

import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { revalidatePath }   from "next/cache";
import { z }                from "zod";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

type CreateTypeResult =
  | { success: true; categoryType: { id: string; name: string; masterProfileId: string; isActive: boolean; createdAt: Date } }
  | { success: false; error: string };

const categorySchema = z.object({
  name:        z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color").default("#6366f1"),
  icon:        z.string().default("tag"),
  typeId:      z.string().optional(),
});

// ── Helper: get caller identity (master or staff) ─────────────
async function getIdentity(siteId?: string) {
  // Try master first
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) {
    // If siteId provided verify ownership
    if (siteId) {
      const site = await prisma.site.findFirst({
        where: { id: siteId, masterProfileId: masterResult.masterProfile.id },
      });
      if (!site) return null;
    }
    return {
      type:            "master" as const,
      masterProfileId: masterResult.masterProfile.id,
      userId:          masterResult.session.user.id,
    };
  }

  // Try staff
  const staffSession = await getStaffSession().catch(() => null);
  if (staffSession && siteId) {
    const subUserSite = await prisma.subUserSite.findUnique({
      where: { subUserId_siteId: { subUserId: staffSession.subUser.id, siteId } },
      include: { site: { include: { masterProfile: true } } },
    });
    if (!subUserSite) return null;
    return {
      type:            "staff" as const,
      masterProfileId: subUserSite.site.masterProfileId,
      subUserId:       staffSession.subUser.id,
    };
  }

  return null;
}

// ── Create Global Category (master only) ─────────────────────
export async function createGlobalCategoryAction(formData: FormData): Promise<ActionResult> {
  const { masterProfile } = await getMasterProfile();

  const parsed = categorySchema.safeParse({
    name:        formData.get("name"),
    description: formData.get("description") || undefined,
    color:       formData.get("color") || "#6366f1",
    icon:        formData.get("icon")  || "tag",
    typeId:      formData.get("typeId") || undefined,
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await prisma.category.create({
    data: {
      ...parsed.data,
      isGlobal:        true,
      siteId:          null,
      masterProfileId: masterProfile.id,
    },
  });

  revalidatePath("/portal");
  return { success: true };
}

// ── Create Site Category (master or staff) ────────────────────
export async function createSiteCategoryAction(
  siteId: string | null,
  formData: FormData
): Promise<ActionResult> {
  const identity = await getIdentity(siteId ?? undefined);
  if (!identity) return { success: false, error: "Unauthorized" };

  const parsed = categorySchema.safeParse({
    name:        formData.get("name"),
    description: formData.get("description") || undefined,
    color:       formData.get("color") || "#6366f1",
    icon:        formData.get("icon")  || "tag",
    typeId:      formData.get("typeId") || undefined,
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await prisma.category.create({
    data: {
      ...parsed.data,
      isGlobal:        siteId === null,
      siteId,
      masterProfileId: identity.masterProfileId,
    },
  });

  if (siteId) revalidatePath(`/portal/${siteId}`);
  else revalidatePath("/dashboard/manage/categories");
  return { success: true };
}

// ── Update Category (master or staff) ─────────────────────────
export async function updateCategoryAction(
  categoryId: string,
  siteId: string | null,
  formData: FormData
): Promise<ActionResult> {
  const identity = await getIdentity(siteId ?? undefined);
  if (!identity) return { success: false, error: "Unauthorized" };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, masterProfileId: identity.masterProfileId, deletedAt: null },
  });
  if (!category) return { success: false, error: "Category not found" };

  // Staff can only edit site-level categories
  if (identity.type === "staff" && category.isGlobal) {
    return { success: false, error: "Staff cannot edit global categories" };
  }

  const parsed = categorySchema.safeParse({
    name:        formData.get("name"),
    description: formData.get("description") || undefined,
    color:       formData.get("color") || category.color,
    icon:        formData.get("icon")  || category.icon,
    typeId:      formData.get("typeId") || undefined,
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await prisma.category.update({
    where: { id: categoryId },
    data:  { ...parsed.data, updatedAt: new Date() },
  });

  revalidatePath(`/portal/${siteId}`);
  return { success: true };
}

// ── Soft Delete Category ──────────────────────────────────────
export async function softDeleteCategoryAction(
  categoryId: string,
  siteId: string | null
): Promise<ActionResult> {
  const identity = await getIdentity(siteId ?? undefined);
  if (!identity) return { success: false, error: "Unauthorized" };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, masterProfileId: identity.masterProfileId, deletedAt: null },
  });
  if (!category) return { success: false, error: "Category not found" };

  if (identity.type === "staff" && category.isGlobal) {
    return { success: false, error: "Staff cannot delete global categories" };
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      deletedAt: new Date(),
      deletedBy: identity.type === "staff" ? identity.subUserId : null,
    },
  });

  revalidatePath(`/portal/${siteId}`);
  return { success: true };
}

// ── Restore Soft Deleted (master only) ───────────────────────
export async function restoreCategoryAction(categoryId: string): Promise<ActionResult> {
  const { masterProfile } = await getMasterProfile();

  await prisma.category.updateMany({
    where: { id: categoryId, masterProfileId: masterProfile.id },
    data:  { deletedAt: null, deletedBy: null },
  });

  return { success: true };
}

// ── Push Global Categories to Sites (master only) ─────────────
export async function pushCategoriesToSitesAction(
  categoryIds: string[],
  siteIds: string[]
): Promise<ActionResult> {
  const { masterProfile } = await getMasterProfile();

  // Verify all categories are global and belong to this master
  const categories = await prisma.category.findMany({
    where: {
      id:              { in: categoryIds },
      masterProfileId: masterProfile.id,
      isGlobal:        true,
      deletedAt:       null,
    },
  });
  if (categories.length !== categoryIds.length) {
    return { success: false, error: "Some categories not found" };
  }

  // Verify all sites belong to this master
  const sites = await prisma.site.findMany({
    where: { id: { in: siteIds }, masterProfileId: masterProfile.id },
  });
  if (sites.length !== siteIds.length) {
    return { success: false, error: "Some sites not found" };
  }

  // For each site, create a copy of each selected category
  // Skip if a category with same name already exists in that site
  await prisma.$transaction(async (tx) => {
    for (const site of sites) {
      for (const cat of categories) {
        const exists = await tx.category.findFirst({
          where: {
            name:            cat.name,
            siteId:          site.id,
            masterProfileId: masterProfile.id,
            deletedAt:       null,
          },
        });
        if (exists) continue; // skip duplicates

        await tx.category.create({
          data: {
            name:            cat.name,
            description:     cat.description,
            color:           cat.color,
            icon:            cat.icon,
            typeId:          cat.typeId,
            isGlobal:        false,
            siteId:          site.id,
            masterProfileId: masterProfile.id,
          },
        });
      }
    }
  });

  return { success: true };
}

// ── Category Type Actions (master only) ──────────────────────
export async function createCategoryTypeAction(name: string): Promise<CreateTypeResult> {
  const { masterProfile } = await getMasterProfile();

  if (!name.trim()) return { success: false, error: "Type name is required" };

  const existing = await prisma.categoryType.findUnique({
    where: { masterProfileId_name: { masterProfileId: masterProfile.id, name: name.trim() } },
  });
  if (existing) return { success: false, error: "Type already exists" };

  const categoryType = await prisma.categoryType.create({
    data: { name: name.trim(), masterProfileId: masterProfile.id },
  });

  return { success: true, categoryType };
}

export async function deleteCategoryTypeAction(typeId: string): Promise<ActionResult> {
  const { masterProfile } = await getMasterProfile();

  // Unlink categories from this type first
  await prisma.category.updateMany({
    where: { typeId, masterProfileId: masterProfile.id },
    data:  { typeId: null },
  });

  await prisma.categoryType.deleteMany({
    where: { id: typeId, masterProfileId: masterProfile.id },
  });

  return { success: true };
}