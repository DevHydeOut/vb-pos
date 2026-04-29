"use server";

import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { revalidatePath }   from "next/cache";
import { z }                from "zod";

/* ── Auth helpers ───────────────────────────────────────── */

async function requireMasterProfile() {
  const result = await getMasterProfile();
  if (!result) throw new Error("Unauthorized");
  return result.masterProfile;
}

async function resolveMasterProfileId(siteId: string | null): Promise<string> {
  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) return masterResult.masterProfile.id;
  if (staffSession && siteId) {
    const site = await prisma.site.findFirst({ where: { id: siteId } });
    if (!site) throw new Error("Site not found");
    return site.masterProfileId;
  }
  throw new Error("Unauthorized");
}

/* ══════════════════════════════════════════════════════════
   TAX GROUPS
══════════════════════════════════════════════════════════ */

const taxGroupSchema = z.object({
  name:        z.string().min(1, "Name is required").max(50),
  rate:        z.coerce.number().min(0, "Rate must be 0 or more").max(100, "Rate cannot exceed 100"),
  description: z.string().optional(),
  isDefault:   z.coerce.boolean().optional(),
});

type TaxResult = { success: true } | { success: false; error: string };

export async function createTaxGroupAction(
  siteId: string | null,
  formData: FormData
): Promise<TaxResult> {
  try {
    const masterProfileId = await resolveMasterProfileId(siteId);
    const parsed = taxGroupSchema.safeParse({
      name:        formData.get("name"),
      rate:        formData.get("rate"),
      description: formData.get("description"),
      isDefault:   formData.get("isDefault") === "true",
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // If setting as default, unset any existing default for this site
    if (parsed.data.isDefault) {
      await prisma.taxGroup.updateMany({
        where: { siteId, masterProfileId, isDefault: true, deletedAt: null },
        data:  { isDefault: false },
      });
    }

    await prisma.taxGroup.create({
      data: {
        ...parsed.data,
        isDefault:      parsed.data.isDefault ?? false,
        masterProfileId,
        siteId,
        isGlobal:       siteId === null,
      },
    });

    if (siteId) revalidatePath(`/portal/${siteId}/settings/tax`);
    else revalidatePath("/dashboard/manage/tax");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to create tax group" };
  }
}

export async function updateTaxGroupAction(
  id: string,
  siteId: string | null,
  formData: FormData
): Promise<TaxResult> {
  try {
    const masterProfileId = siteId
      ? await resolveMasterProfileId(siteId)
      : (await requireMasterProfile()).id;

    const parsed = taxGroupSchema.safeParse({
      name:        formData.get("name"),
      rate:        formData.get("rate"),
      description: formData.get("description"),
      isDefault:   formData.get("isDefault") === "true",
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    if (parsed.data.isDefault && siteId) {
      await prisma.taxGroup.updateMany({
        where: { siteId, masterProfileId, isDefault: true, deletedAt: null, id: { not: id } },
        data:  { isDefault: false },
      });
    }

    await prisma.taxGroup.update({ where: { id }, data: parsed.data });

    if (siteId) revalidatePath(`/portal/${siteId}/settings/tax`);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update tax group" };
  }
}

export async function softDeleteTaxGroupAction(
  id: string,
  siteId: string | null
): Promise<TaxResult> {
  try {
    await prisma.taxGroup.update({
      where: { id },
      data:  { deletedAt: new Date(), isDefault: false },
    });
    if (siteId) revalidatePath(`/portal/${siteId}/settings/tax`);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete tax group" };
  }
}

export async function pushTaxGroupsToSitesAction(
  taxGroupIds: string[],
  targetSiteIds: string[]
): Promise<TaxResult> {
  try {
    const master = await requireMasterProfile();

    const sources = await prisma.taxGroup.findMany({
      where: { id: { in: taxGroupIds }, masterProfileId: master.id, deletedAt: null },
    });

    for (const siteId of targetSiteIds) {
      for (const src of sources) {
        const exists = await prisma.taxGroup.findFirst({
          where: { masterProfileId: master.id, siteId, name: src.name, deletedAt: null },
        });
        if (exists) continue;
        await prisma.taxGroup.create({
          data: {
            name:            src.name,
            rate:            src.rate,
            description:     src.description,
            isDefault:       false,
            isGlobal:        true,
            masterProfileId: master.id,
            siteId,
          },
        });
      }
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to push tax groups" };
  }
}

/* ══════════════════════════════════════════════════════════
   COUPONS
══════════════════════════════════════════════════════════ */

const couponSchema = z.object({
  code:          z.string().min(1, "Code is required").max(30).transform((v) => v.toUpperCase()),
  description:   z.string().optional(),
  discountType:  z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce.number().min(0.01, "Discount must be greater than 0"),
  capAmount:     z.coerce.number().min(0).optional().nullable(),
  applyOn:       z.enum(["SUBTOTAL_TAX_RECALC", "SUBTOTAL_TAX_FIXED", "TOTAL"]),
  minOrderValue: z.coerce.number().min(0).optional().nullable(),
  expiresAt:     z.string().optional().nullable()
    .transform((v) => (v && v.trim() !== "" ? new Date(v) : null)),
  isActive:      z.coerce.boolean().optional(),
});

type CouponResult = { success: true } | { success: false; error: string };

export async function createCouponAction(
  siteId: string | null,
  formData: FormData
): Promise<CouponResult> {
  try {
    const masterProfileId = await resolveMasterProfileId(siteId);
    const parsed = couponSchema.safeParse({
      code:          formData.get("code"),
      description:   formData.get("description"),
      discountType:  formData.get("discountType"),
      discountValue: formData.get("discountValue"),
      capAmount:     formData.get("capAmount") || null,
      applyOn:       formData.get("applyOn"),
      minOrderValue: formData.get("minOrderValue") || null,
      expiresAt:     formData.get("expiresAt") || null,
      isActive:      true,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // Check duplicate code per site (same code allowed on different sites)
    const existing = await prisma.coupon.findFirst({
      where: { masterProfileId, siteId, code: parsed.data.code, deletedAt: null },
    });
    if (existing) return { success: false, error: `Coupon code "${parsed.data.code}" already exists` };

    // Percentage cap only makes sense for PERCENTAGE type
    const capAmount = parsed.data.discountType === "PERCENTAGE"
      ? (parsed.data.capAmount ?? null)
      : null;

    await prisma.coupon.create({
      data: {
        ...parsed.data,
        capAmount,
        isActive:       parsed.data.isActive ?? true,
        isGlobal:       siteId === null,
        masterProfileId,
        siteId,
      },
    });

    if (siteId) revalidatePath(`/portal/${siteId}/sale/coupons`);
    else revalidatePath("/dashboard/manage/coupons");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to create coupon" };
  }
}

export async function updateCouponAction(
  id: string,
  siteId: string | null,
  formData: FormData
): Promise<CouponResult> {
  try {
    const masterProfileId = siteId
      ? await resolveMasterProfileId(siteId)
      : (await requireMasterProfile()).id;

    const parsed = couponSchema.safeParse({
      code:          formData.get("code"),
      description:   formData.get("description"),
      discountType:  formData.get("discountType"),
      discountValue: formData.get("discountValue"),
      capAmount:     formData.get("capAmount") || null,
      applyOn:       formData.get("applyOn"),
      minOrderValue: formData.get("minOrderValue") || null,
      expiresAt:     formData.get("expiresAt") || null,
      isActive:      formData.get("isActive") === "true",
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // Check duplicate code per site excluding self
    const existing = await prisma.coupon.findFirst({
      where: { masterProfileId, siteId, code: parsed.data.code, deletedAt: null, id: { not: id } },
    });
    if (existing) return { success: false, error: `Coupon code "${parsed.data.code}" already exists` };

    const capAmount = parsed.data.discountType === "PERCENTAGE"
      ? (parsed.data.capAmount ?? null)
      : null;

    await prisma.coupon.update({ where: { id }, data: { ...parsed.data, capAmount } });

    if (siteId) revalidatePath(`/portal/${siteId}/sale/coupons`);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update coupon" };
  }
}

export async function softDeleteCouponAction(
  id: string,
  siteId: string | null
): Promise<CouponResult> {
  try {
    await prisma.coupon.update({ where: { id }, data: { deletedAt: new Date() } });
    if (siteId) revalidatePath(`/portal/${siteId}/sale/coupons`);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete coupon" };
  }
}

export async function pushCouponsToSitesAction(
  couponIds: string[],
  targetSiteIds: string[]
): Promise<CouponResult> {
  try {
    const master = await requireMasterProfile();

    const sources = await prisma.coupon.findMany({
      where: { id: { in: couponIds }, masterProfileId: master.id, deletedAt: null },
    });

    for (const targetSiteId of targetSiteIds) {
      for (const src of sources) {
        // Check if a site-level copy already exists for this site
        const exists = await prisma.coupon.findFirst({
          where: {
            masterProfileId: master.id,
            siteId:          targetSiteId,
            code:            src.code,
            deletedAt:       null,
          },
        });
        if (exists) continue;

        await prisma.coupon.create({
          data: {
            code:            src.code,
            description:     src.description,
            discountType:    src.discountType,
            discountValue:   src.discountValue,
            capAmount:       src.capAmount,
            applyOn:         src.applyOn,
            minOrderValue:   src.minOrderValue,
            expiresAt:       src.expiresAt,
            isActive:        src.isActive,
            isGlobal:        true,
            masterProfileId: master.id,
            siteId:          targetSiteId,
          },
        });
      }
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to push coupons" };
  }
}

// calculateDiscount has been moved to @/lib/discount
// import { calculateDiscount } from "@/lib/discount"