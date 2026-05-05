"use server";

// src/actions/portal/loyalty.ts

import { revalidatePath }    from "next/cache";
import { prisma }            from "@/lib/prisma";
import { getMasterProfile }  from "@/data/master";
import { getStaffSession }   from "@/actions/auth/staff";
import { z }                 from "zod";

/* ── Types ───────────────────────────────────────────────────── */

type ActionResult =
  | { success: true }
  | { success: false; error: string };

type CreateResult =
  | { success: true; id: string }
  | { success: false; error: string };

/* ── Helpers ─────────────────────────────────────────────────── */

async function getMaster() {
  const result = await getMasterProfile();
  if (!result) throw new Error("Unauthorized");
  return result.masterProfile;
}

async function resolveIdentity(siteId: string | null) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) return { masterProfileId: masterResult.masterProfile.id, isMaster: true };

  const staffSession = await getStaffSession().catch(() => null);
  if (staffSession && siteId) {
    const site = await prisma.site.findFirst({ where: { id: siteId } });
    if (!site) throw new Error("Site not found");
    return { masterProfileId: site.masterProfileId, isMaster: false };
  }
  throw new Error("Unauthorized");
}

function revalidateLoyalty(siteId?: string | null) {
  revalidatePath("/dashboard/settings/loyalty");
  revalidatePath("/dashboard/manage/loyalty");
  if (siteId) {
    revalidatePath(`/portal/${siteId}/loyalty/rewards`);
    revalidatePath(`/portal/${siteId}/loyalty/customers`);
  }
}

/* ═══════════════════════════════════════════════════════════════
   PROGRAM SETTINGS
═══════════════════════════════════════════════════════════════ */

const programSchema = z.object({
  isEnabled:    z.boolean(),
  pointsPerUnit: z.coerce.number().int().min(1).max(10000),
  unitValue:    z.coerce.number().min(0.01),
  pointsName:   z.string().min(1).max(30),
  expiryDays:   z.coerce.number().int().min(1).optional().nullable(),
});

// Get or create the loyalty program for this master account
export async function getLoyaltyProgramAction() {
  const master = await getMaster();
  const program = await prisma.loyaltyProgram.upsert({
    where:  { masterProfileId: master.id },
    update: {},
    create: {
      masterProfileId: master.id,
      isEnabled:       false,
      pointsPerUnit:   1,
      unitValue:       1,
      pointsName:      "Points",
    },
    include: {
      siteOverrides: { include: { site: { select: { id: true, name: true } } } },
      rewards:       { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      earnRules:     { where: { deletedAt: null }, orderBy: { createdAt: "desc" },
                       include: { product: { select: { id: true, name: true } },
                                  category: { select: { id: true, name: true } } } },
    },
  });
  return { success: true as const, program };
}

// Update master-level program settings
export async function updateLoyaltyProgramAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const master = await getMaster();
    const parsed = programSchema.safeParse({
      isEnabled:     formData.get("isEnabled") === "true",
      pointsPerUnit: formData.get("pointsPerUnit"),
      unitValue:     formData.get("unitValue"),
      pointsName:    formData.get("pointsName"),
      expiryDays:    formData.get("expiryDays") || null,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    await prisma.loyaltyProgram.upsert({
      where:  { masterProfileId: master.id },
      update: parsed.data,
      create: { masterProfileId: master.id, ...parsed.data },
    });

    revalidateLoyalty();
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update loyalty program" };
  }
}

// Update site-level override
export async function updateSiteLoyaltyOverrideAction(
  siteId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    // Works for both master and staff — staff can update their own site only
    const identity = await resolveIdentity(siteId);
    const program  = await prisma.loyaltyProgram.findUnique({
      where: { masterProfileId: identity.masterProfileId },
    });
    if (!program) return { success: false, error: "Loyalty program not found" };

    const isEnabled    = formData.get("isEnabled") === "true";
    const pointsPerUnit = formData.get("pointsPerUnit") ? Number(formData.get("pointsPerUnit")) : null;
    const unitValue     = formData.get("unitValue")     ? Number(formData.get("unitValue"))     : null;

    await prisma.loyaltyProgramSite.upsert({
      where:  { siteId },
      update: { isEnabled, pointsPerUnit, unitValue },
      create: { siteId, loyaltyProgramId: program.id, isEnabled, pointsPerUnit, unitValue },
    });

    revalidateLoyalty(siteId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update site loyalty settings" };
  }
}

/* ═══════════════════════════════════════════════════════════════
   EARN RULES
═══════════════════════════════════════════════════════════════ */

const earnRuleSchema = z.object({
  name:        z.string().min(1, "Name is required"),
  description: z.string().optional(),
  productId:   z.string().optional().nullable(),
  categoryId:  z.string().optional().nullable(),
  bonusType:   z.enum(["MULTIPLIER", "FLAT"]),
  bonusValue:  z.coerce.number().min(0.1),
  siteId:      z.string().optional().nullable(),
});

export async function createEarnRuleAction(
  formData: FormData
): Promise<CreateResult> {
  try {
    const master  = await getMaster();
    const program = await prisma.loyaltyProgram.findUnique({
      where: { masterProfileId: master.id },
    });
    if (!program) return { success: false, error: "Set up loyalty program first" };

    const parsed = earnRuleSchema.safeParse({
      name:        formData.get("name"),
      description: formData.get("description") || undefined,
      productId:   formData.get("productId")   || null,
      categoryId:  formData.get("categoryId")  || null,
      bonusType:   formData.get("bonusType"),
      bonusValue:  formData.get("bonusValue"),
      siteId:      formData.get("siteId")      || null,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    if (!parsed.data.productId && !parsed.data.categoryId) {
      return { success: false, error: "Select a product or category for this rule" };
    }

    const rule = await prisma.loyaltyEarnRule.create({
      data: { ...parsed.data, loyaltyProgramId: program.id },
    });

    revalidateLoyalty(parsed.data.siteId);
    return { success: true, id: rule.id };
  } catch {
    return { success: false, error: "Failed to create earn rule" };
  }
}

export async function updateEarnRuleAction(
  ruleId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const master  = await getMaster();
    const program = await prisma.loyaltyProgram.findUnique({
      where: { masterProfileId: master.id },
    });
    if (!program) return { success: false, error: "Program not found" };

    const rule = await prisma.loyaltyEarnRule.findFirst({
      where: { id: ruleId, loyaltyProgramId: program.id, deletedAt: null },
    });
    if (!rule) return { success: false, error: "Rule not found" };

    const parsed = earnRuleSchema.safeParse({
      name:        formData.get("name"),
      description: formData.get("description") || undefined,
      productId:   formData.get("productId")   || null,
      categoryId:  formData.get("categoryId")  || null,
      bonusType:   formData.get("bonusType"),
      bonusValue:  formData.get("bonusValue"),
      siteId:      formData.get("siteId")      || null,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    await prisma.loyaltyEarnRule.update({
      where: { id: ruleId },
      data:  parsed.data,
    });

    revalidateLoyalty(parsed.data.siteId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update earn rule" };
  }
}

export async function deleteEarnRuleAction(ruleId: string): Promise<ActionResult> {
  try {
    const master  = await getMaster();
    const program = await prisma.loyaltyProgram.findUnique({
      where: { masterProfileId: master.id },
    });
    if (!program) return { success: false, error: "Program not found" };

    await prisma.loyaltyEarnRule.update({
      where: { id: ruleId, loyaltyProgramId: program.id },
      data:  { deletedAt: new Date() },
    });

    revalidateLoyalty();
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete earn rule" };
  }
}

/* ═══════════════════════════════════════════════════════════════
   REWARDS
═══════════════════════════════════════════════════════════════ */

const rewardSchema = z.object({
  name:           z.string().min(1, "Name is required"),
  description:    z.string().optional(),
  type:           z.enum(["FREE_PRODUCT", "FIXED_DISCOUNT", "PERCENT_DISCOUNT", "CUSTOM_VOUCHER"]),
  pointsCost:     z.coerce.number().int().min(1, "Points cost must be at least 1"),
  discountValue:  z.coerce.number().min(0).optional().nullable(),
  productId:      z.string().optional().nullable(),
  voucherNote:    z.string().optional().nullable(),
  isGlobal:       z.boolean().default(true),
  siteId:         z.string().optional().nullable(),
  maxRedemptions: z.coerce.number().int().min(1).optional().nullable(),
  expiresAt:      z.coerce.date().optional().nullable(),
});

export async function createRewardAction(
  formData: FormData
): Promise<CreateResult> {
  try {
    const master  = await getMaster();
    const program = await prisma.loyaltyProgram.findUnique({
      where: { masterProfileId: master.id },
    });
    if (!program) return { success: false, error: "Set up loyalty program first" };

    const isGlobal = formData.get("isGlobal") !== "false";
    const parsed = rewardSchema.safeParse({
      name:           formData.get("name"),
      description:    formData.get("description")    || undefined,
      type:           formData.get("type"),
      pointsCost:     formData.get("pointsCost"),
      discountValue:  formData.get("discountValue")  || null,
      productId:      formData.get("productId")      || null,
      voucherNote:    formData.get("voucherNote")    || null,
      isGlobal,
      siteId:         isGlobal ? null : (formData.get("siteId") || null),
      maxRedemptions: formData.get("maxRedemptions") || null,
      expiresAt:      formData.get("expiresAt")      || null,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // Validate by type
    const d = parsed.data;
    if (d.type === "FREE_PRODUCT"     && !d.productId)     return { success: false, error: "Select a product for this reward" };
    if (d.type === "FIXED_DISCOUNT"   && !d.discountValue) return { success: false, error: "Enter a discount amount" };
    if (d.type === "PERCENT_DISCOUNT" && !d.discountValue) return { success: false, error: "Enter a discount percentage" };
    if (d.type === "CUSTOM_VOUCHER"   && !d.voucherNote)   return { success: false, error: "Enter instructions for staff" };

    const reward = await prisma.loyaltyReward.create({
      data: {
        ...parsed.data,
        loyaltyProgramId: program.id,
        masterProfileId:  master.id,
      },
    });

    revalidateLoyalty(parsed.data.siteId);
    return { success: true, id: reward.id };
  } catch {
    return { success: false, error: "Failed to create reward" };
  }
}

export async function updateRewardAction(
  rewardId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const master = await getMaster();
    const reward = await prisma.loyaltyReward.findFirst({
      where: { id: rewardId, masterProfileId: master.id, deletedAt: null },
    });
    if (!reward) return { success: false, error: "Reward not found" };

    const isGlobal = formData.get("isGlobal") !== "false";
    const parsed = rewardSchema.safeParse({
      name:           formData.get("name"),
      description:    formData.get("description")    || undefined,
      type:           formData.get("type"),
      pointsCost:     formData.get("pointsCost"),
      discountValue:  formData.get("discountValue")  || null,
      productId:      formData.get("productId")      || null,
      voucherNote:    formData.get("voucherNote")    || null,
      isGlobal,
      siteId:         isGlobal ? null : (formData.get("siteId") || null),
      maxRedemptions: formData.get("maxRedemptions") || null,
      expiresAt:      formData.get("expiresAt")      || null,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    await prisma.loyaltyReward.update({
      where: { id: rewardId },
      data:  parsed.data,
    });

    revalidateLoyalty(parsed.data.siteId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update reward" };
  }
}

export async function deleteRewardAction(rewardId: string): Promise<ActionResult> {
  try {
    const master = await getMaster();
    const reward = await prisma.loyaltyReward.findFirst({
      where: { id: rewardId, masterProfileId: master.id, deletedAt: null },
    });
    if (!reward) return { success: false, error: "Reward not found" };

    await prisma.loyaltyReward.update({
      where: { id: rewardId },
      data:  { deletedAt: new Date() },
    });

    revalidateLoyalty(reward.siteId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete reward" };
  }
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER ACTIONS (used at POS + customer management pages)
═══════════════════════════════════════════════════════════════ */

const customerSchema = z.object({
  name:        z.string().min(1, "Name is required"),
  phone:       z.string().min(5, "Phone number is required"),
  email:       z.string().email().optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  notes:       z.string().optional().nullable(),
});

export async function createCustomerAction(
  siteId: string | null,
  formData: FormData
): Promise<CreateResult> {
  try {
    const identity = await resolveIdentity(siteId);
    const parsed = customerSchema.safeParse({
      name:        formData.get("name"),
      phone:       formData.get("phone"),
      email:       formData.get("email")       || null,
      dateOfBirth: formData.get("dateOfBirth") || null,
      notes:       formData.get("notes")       || null,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // Check phone uniqueness for this business
    const existing = await prisma.customer.findFirst({
      where: { masterProfileId: identity.masterProfileId, phone: parsed.data.phone, deletedAt: null },
    });
    if (existing) return { success: false, error: "A customer with this phone number already exists" };

    const customer = await prisma.customer.create({
      data: {
        ...parsed.data,
        masterProfileId: identity.masterProfileId,
        // Auto-create loyalty balance record
        loyalty: { create: { currentPoints: 0, lifetimePoints: 0, lifetimeSpend: 0 } },
      },
    });

    revalidatePath(siteId ? `/portal/${siteId}/customers` : "/dashboard/manage/customers");
    return { success: true, id: customer.id };
  } catch {
    return { success: false, error: "Failed to create customer" };
  }
}

export async function updateCustomerAction(
  customerId: string,
  siteId: string | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);
    const parsed = customerSchema.safeParse({
      name:        formData.get("name"),
      phone:       formData.get("phone"),
      email:       formData.get("email")       || null,
      dateOfBirth: formData.get("dateOfBirth") || null,
      notes:       formData.get("notes")       || null,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, masterProfileId: identity.masterProfileId, deletedAt: null },
    });
    if (!customer) return { success: false, error: "Customer not found" };

    // Check phone uniqueness (exclude self)
    const phoneConflict = await prisma.customer.findFirst({
      where: {
        masterProfileId: identity.masterProfileId,
        phone:           parsed.data.phone,
        deletedAt:       null,
        NOT: { id: customerId },
      },
    });
    if (phoneConflict) return { success: false, error: "Another customer already uses this phone number" };

    await prisma.customer.update({
      where: { id: customerId },
      data:  parsed.data,
    });

    revalidatePath(siteId ? `/portal/${siteId}/customers` : "/dashboard/manage/customers");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update customer" };
  }
}

// Lookup by phone — used at POS checkout
export async function lookupCustomerByPhoneAction(
  phone: string,
  siteId: string | null
) {
  try {
    const identity = await resolveIdentity(siteId);
    const customer = await prisma.customer.findFirst({
      where: {
        masterProfileId: identity.masterProfileId,
        phone:           phone.trim(),
        deletedAt:       null,
        isActive:        true,
      },
      include: {
        loyalty: true,
      },
    });
    if (!customer) return { success: false as const, error: "No customer found with this phone number" };

    // Get available rewards for this customer
    const program = await prisma.loyaltyProgram.findUnique({
      where: { masterProfileId: identity.masterProfileId },
      include: {
        rewards: {
          where: {
            deletedAt: null,
            isActive:  true,
            OR: [{ isGlobal: true }, { siteId }],
          },
          orderBy: { pointsCost: "asc" },
        },
      },
    });

    const currentPoints  = customer.loyalty?.currentPoints ?? 0;
    const availableRewards = program?.rewards.filter(
      (r) => r.pointsCost <= currentPoints &&
             (r.maxRedemptions == null || r.redemptionCount < r.maxRedemptions) &&
             (r.expiresAt == null || r.expiresAt > new Date())
    ).map((reward) => ({
      id: reward.id,
      name: reward.name,
      pointsCost: reward.pointsCost,
      type: reward.type,
      discountValue: reward.discountValue,
      productId: reward.productId,
    })) ?? [];

    return {
      success: true  as const,
      customer: {
        id:            customer.id,
        name:          customer.name,
        phone:         customer.phone,
        currentPoints,
        lifetimePoints: customer.loyalty?.lifetimePoints ?? 0,
        availableRewards,
      },
    };
  } catch {
    return { success: false as const, error: "Lookup failed" };
  }
}

// Manual point adjustment (admin/master only)
export async function adjustCustomerPointsAction(
  customerId: string,
  points: number,         // positive = add, negative = deduct
  note: string,
  siteId: string | null
): Promise<ActionResult> {
  try {
    const master   = await getMaster();
    const customer = await prisma.customer.findFirst({
      where:   { id: customerId, masterProfileId: master.id, deletedAt: null },
      include: { loyalty: true },
    });
    if (!customer)         return { success: false, error: "Customer not found" };
    if (!customer.loyalty) return { success: false, error: "Customer has no loyalty account" };

    const balanceBefore = customer.loyalty.currentPoints;
    const balanceAfter  = Math.max(0, balanceBefore + points); // never go below 0

    await prisma.$transaction([
      prisma.customerLoyalty.update({
        where: { customerId },
        data:  {
          currentPoints:  balanceAfter,
          lifetimePoints: points > 0
            ? { increment: points }
            : customer.loyalty.lifetimePoints, // don't change lifetime on deduct
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          type:           "ADJUST",
          points:         balanceAfter - balanceBefore, // actual change (may differ if capped at 0)
          balanceBefore,
          balanceAfter,
          note,
          customerId,
          siteId,
          masterProfileId: master.id,
          createdBy:       master.id,
        },
      }),
    ]);

    revalidatePath(siteId ? `/portal/${siteId}/loyalty/customers` : "/dashboard/manage/loyalty");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to adjust points" };
  }
}

/* ═══════════════════════════════════════════════════════════════
   POINT CALCULATION HELPERS (used by POS when completing a sale)
   These will be called from the future order/checkout action
═══════════════════════════════════════════════════════════════ */

// Calculate points earned for a sale
// Returns { basePoints, bonusPoints, total }
export async function calculatePointsForSaleAction(
  masterProfileId: string,
  siteId: string | null,
  saleAmount: number,             // total spend in master currency
  lineItems: { productId: string; categoryId: string | null; quantity: number; lineTotal: number }[]
) {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { masterProfileId },
    include: {
      siteOverrides: { where: { siteId: siteId ?? "" } },
      earnRules: {
        where: {
          deletedAt: null,
          isActive:  true,
          OR: [{ siteId: null }, { siteId }],
        },
        include: { product: true, category: true },
      },
    },
  });

  if (!program?.isEnabled) return { basePoints: 0, bonusPoints: 0, total: 0 };

  const siteOverride = program.siteOverrides[0];
  if (siteOverride && !siteOverride.isEnabled) return { basePoints: 0, bonusPoints: 0, total: 0 };

  // Use site override rate if set, otherwise master rate
  const rate      = siteOverride?.pointsPerUnit ?? program.pointsPerUnit;
  const unitValue = siteOverride?.unitValue     ?? program.unitValue;

  // Base points from total spend
  const basePoints = Math.floor((saleAmount / unitValue) * rate);

  // Bonus points from earn rules
  let bonusPoints = 0;
  for (const item of lineItems) {
    for (const rule of program.earnRules) {
      const matchesProduct  = rule.productId  && rule.productId  === item.productId;
      const matchesCategory = rule.categoryId && rule.categoryId === item.categoryId;
      if (!matchesProduct && !matchesCategory) continue;

      const itemBasePoints = Math.floor((item.lineTotal / unitValue) * rate);
      if (rule.bonusType === "MULTIPLIER") {
        // e.g. 2x multiplier: bonus = itemBasePoints × (multiplier - 1)
        bonusPoints += Math.floor(itemBasePoints * (rule.bonusValue - 1));
      } else {
        // FLAT: fixed bonus per item purchased
        bonusPoints += Math.floor(rule.bonusValue * item.quantity);
      }
    }
  }

  return { basePoints, bonusPoints, total: basePoints + bonusPoints };
}

// Award points after a completed sale (called from order action)
export async function awardPointsAction(
  customerId: string,
  points: number,
  orderId: string,
  siteId: string | null,
  masterProfileId: string
): Promise<ActionResult> {
  if (points <= 0) return { success: true };
  try {
    const loyalty = await prisma.customerLoyalty.findUnique({ where: { customerId } });
    if (!loyalty) return { success: false, error: "Customer loyalty account not found" };

    const balanceBefore = loyalty.currentPoints;
    const balanceAfter  = balanceBefore + points;

    await prisma.$transaction([
      prisma.customerLoyalty.update({
        where: { customerId },
        data:  {
          currentPoints:  balanceAfter,
          lifetimePoints: { increment: points },
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          type: "EARN", points, balanceBefore, balanceAfter,
          customerId, orderId, siteId, masterProfileId,
        },
      }),
    ]);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to award points" };
  }
}

// Redeem a reward (called from order action when customer uses points)
export async function redeemRewardAction(
  customerId: string,
  rewardId: string,
  orderId: string,
  siteId: string | null,
  masterProfileId: string
): Promise<ActionResult> {
  try {
    const [loyalty, reward] = await Promise.all([
      prisma.customerLoyalty.findUnique({ where: { customerId } }),
      prisma.loyaltyReward.findFirst({
        where: { id: rewardId, masterProfileId, deletedAt: null, isActive: true },
      }),
    ]);

    if (!loyalty) return { success: false, error: "Customer loyalty account not found" };
    if (!reward)  return { success: false, error: "Reward not found or inactive" };
    if (loyalty.currentPoints < reward.pointsCost) {
      return { success: false, error: `Not enough points (need ${reward.pointsCost}, have ${loyalty.currentPoints})` };
    }
    if (reward.maxRedemptions != null && reward.redemptionCount >= reward.maxRedemptions) {
      return { success: false, error: "This reward has reached its redemption limit" };
    }
    if (reward.expiresAt && reward.expiresAt < new Date()) {
      return { success: false, error: "This reward has expired" };
    }

    const balanceBefore = loyalty.currentPoints;
    const balanceAfter  = balanceBefore - reward.pointsCost;

    await prisma.$transaction([
      prisma.customerLoyalty.update({
        where: { customerId },
        data:  { currentPoints: balanceAfter },
      }),
      prisma.loyaltyReward.update({
        where: { id: rewardId },
        data:  { redemptionCount: { increment: 1 } },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          type: "REDEEM",
          points: -reward.pointsCost,
          balanceBefore,
          balanceAfter,
          customerId,
          rewardId,
          orderId,
          siteId,
          masterProfileId,
          note: `Redeemed: ${reward.name}`,
        },
      }),
    ]);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to redeem reward" };
  }
}
