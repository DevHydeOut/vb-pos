"use server";

import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { revalidatePath }   from "next/cache";
import { z }                from "zod";
import { getCountry }       from "@/lib/countries";

/* ── Helpers ────────────────────────────────────────────────── */

async function requireMaster() {
  const result = await getMasterProfile();
  if (!result) throw new Error("Unauthorized");
  return result.masterProfile;
}

async function requireStaffOrMaster(siteId: string) {
  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);
  if (!staffSession && !masterResult) throw new Error("Unauthorized");
  return { staffSession, masterResult, isMaster: !!masterResult && !staffSession };
}

type ActionResult = { success: true } | { success: false; error: string };

/* ══════════════════════════════════════════════════════════════
   MASTER PROFILE
══════════════════════════════════════════════════════════════ */

const masterProfileSchema = z.object({
  businessName:          z.string().min(1, "Business name is required").max(100),
  phone:                 z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
  countryCode:           z.string().min(1, "Country is required"),
  // Locale fields — auto-filled from country but overridable
  currencyCode:          z.string().min(1),
  currencySymbol:        z.string().min(1),
  phoneCode:             z.string().min(1),
  timezone:              z.string().min(1),
  dateFormat:            z.string().min(1),
});

export async function updateMasterProfileAction(
  formData: FormData
): Promise<ActionResult & { cascadeNeeded?: boolean; siteCount?: number }> {
  try {
    const master = await requireMaster();

    const parsed = masterProfileSchema.safeParse({
      businessName:          formData.get("businessName"),
      phone:                 formData.get("phone") || undefined,
      taxRegistrationNumber: formData.get("taxRegistrationNumber") || undefined,
      countryCode:           formData.get("countryCode"),
      currencyCode:          formData.get("currencyCode"),
      currencySymbol:        formData.get("currencySymbol"),
      phoneCode:             formData.get("phoneCode"),
      timezone:              formData.get("timezone"),
      dateFormat:            formData.get("dateFormat"),
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // Check how many non-overridden sites would be affected
    const affectedSites = await prisma.site.count({
      where: { masterProfileId: master.id, countryOverridden: false },
    });

    await prisma.masterProfile.update({
      where: { id: master.id },
      data:  {
        ...parsed.data,
        profileComplete: true,
      },
    });

    revalidatePath("/dashboard/profile");

    // Tell client how many sites need cascade confirmation
    return {
      success:        true,
      cascadeNeeded:  affectedSites > 0,
      siteCount:      affectedSites,
    };
  } catch (e) {
    return { success: false, error: "Failed to update profile" };
  }
}

// Called after master confirms cascade dialog
export async function cascadeLocaleToSitesAction(): Promise<ActionResult> {
  try {
    const master = await requireMaster();

    await prisma.site.updateMany({
      where: { masterProfileId: master.id, countryOverridden: false },
      data:  {
        currencyCode:   master.currencyCode,
        currencySymbol: master.currencySymbol,
        phoneCode:      master.phoneCode,
        timezone:       master.timezone,
        dateFormat:     master.dateFormat,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to cascade locale to sites" };
  }
}

export async function uploadMasterLogoAction(
  logoUrl: string
): Promise<ActionResult> {
  try {
    const master = await requireMaster();
    await prisma.masterProfile.update({
      where: { id: master.id },
      data:  { businessLogoUrl: logoUrl },
    });
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update logo" };
  }
}

/* ══════════════════════════════════════════════════════════════
   SITE SETTINGS
══════════════════════════════════════════════════════════════ */

const siteSettingsSchema = z.object({
  name:                  z.string().min(1, "Site name is required").max(100),
  address:               z.string().optional(),
  phone:                 z.string().optional(),
  currencyCode:          z.string().min(1),
  currencySymbol:        z.string().min(1),
  phoneCode:             z.string().min(1),
  timezone:              z.string().min(1),
  dateFormat:            z.string().min(1),
  taxInclusive:          z.coerce.boolean(),
  taxRegistrationNumber: z.string().optional(),
  logoUrl:               z.string().optional(),
  receiptFooter:         z.string().max(200).optional(),
  language:              z.string().default("en"),
});

export async function updateSiteSettingsAction(
  siteId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireStaffOrMaster(siteId);

    const parsed = siteSettingsSchema.safeParse({
      name:                  formData.get("name"),
      address:               formData.get("address")               || undefined,
      phone:                 formData.get("phone")                 || undefined,
      currencyCode:          formData.get("currencyCode"),
      currencySymbol:        formData.get("currencySymbol"),
      phoneCode:             formData.get("phoneCode"),
      timezone:              formData.get("timezone"),
      dateFormat:            formData.get("dateFormat"),
      taxInclusive:          formData.get("taxInclusive") === "true",
      taxRegistrationNumber: formData.get("taxRegistrationNumber") || undefined,
      logoUrl:               formData.get("logoUrl")               || undefined,
      receiptFooter:         formData.get("receiptFooter")         || undefined,
      language:              formData.get("language")              || "en",
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    await prisma.site.update({
      where: { id: siteId },
      data:  {
        ...parsed.data,
        countryOverridden: true, // mark as manually customised — skip master cascades
      },
    });

    revalidatePath(`/portal/${siteId}/settings`);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update site settings" };
  }
}

// Reset site locale back to master defaults
export async function resetSiteLocaleAction(siteId: string): Promise<ActionResult> {
  try {
    const master = await requireMaster();

    await prisma.site.update({
      where: { id: siteId },
      data:  {
        currencyCode:     master.currencyCode,
        currencySymbol:   master.currencySymbol,
        phoneCode:        master.phoneCode,
        timezone:         master.timezone,
        dateFormat:       master.dateFormat,
        countryOverridden: false,
      },
    });

    revalidatePath(`/portal/${siteId}/settings`);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to reset locale" };
  }
}

/* ══════════════════════════════════════════════════════════════
   SUB-USER PROFILE
══════════════════════════════════════════════════════════════ */

const subUserProfileSchema = z.object({
  name:     z.string().min(1, "Name is required").max(80),
  phone:    z.string().optional(),
  language: z.string().default("en"),
});

export async function updateSubUserProfileAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await getStaffSession();
    if (!session) throw new Error("Unauthorized");

    const parsed = subUserProfileSchema.safeParse({
      name:     formData.get("name"),
      phone:    formData.get("phone") || undefined,
      language: formData.get("language") || "en",
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    await prisma.subUser.update({
      where: { id: session.subUser.id },
      data:  parsed.data,
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update profile" };
  }
}

export async function updateSubUserAvatarAction(
  avatarUrl: string
): Promise<ActionResult> {
  try {
    const session = await getStaffSession();
    if (!session) throw new Error("Unauthorized");

    await prisma.subUser.update({
      where: { id: session.subUser.id },
      data:  { avatarUrl },
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update avatar" };
  }
}

export async function changeSubUserPasswordAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await getStaffSession();
    if (!session) throw new Error("Unauthorized");

    const current = formData.get("currentPassword") as string;
    const next    = formData.get("newPassword")     as string;

    if (!current || !next) return { success: false, error: "Both fields required" };
    if (next.length < 6)   return { success: false, error: "Password must be at least 6 characters" };

    const { verify, hash } = await import("@node-rs/argon2");
    const valid = await verify(session.subUser.password, current);
    if (!valid) return { success: false, error: "Current password is incorrect" };

    const hashed = await hash(next);
    await prisma.subUser.update({
      where: { id: session.subUser.id },
      data:  { password: hashed },
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to change password" };
  }
}