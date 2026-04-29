"use server";

import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";
import { revalidatePath }   from "next/cache";
import { z }                from "zod";
import { createClient }     from "@supabase/supabase-js";

/* ── Types ───────────────────────────────────────────────────── */

type ActionResult =
  | { success: true }
  | { success: false; error: string };

type CreateResult =
  | { success: true; productId: string }
  | { success: false; error: string };

type VariantCreateResult =
  | { success: true; variantId: string }
  | { success: false; error: string };

/* ── Helpers ─────────────────────────────────────────────────── */

async function resolveIdentity(siteId: string | null) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) return { masterProfileId: masterResult.masterProfile.id, type: "master" as const };

  const staffSession = await getStaffSession().catch(() => null);
  if (staffSession && siteId) {
    const site = await prisma.site.findFirst({ where: { id: siteId } });
    if (!site) throw new Error("Site not found");
    return { masterProfileId: site.masterProfileId, type: "staff" as const };
  }
  throw new Error("Unauthorized");
}

function revalidateProduct(siteId: string | null, productId?: string) {
  if (siteId) {
    revalidatePath(`/portal/${siteId}/inventory/products`);
    if (productId) revalidatePath(`/portal/${siteId}/inventory/products/${productId}`);
  } else {
    revalidatePath("/dashboard/manage/products");
    if (productId) revalidatePath(`/dashboard/manage/products/${productId}`);
  }
}

/* ── Schemas ─────────────────────────────────────────────────── */

const productSchema = z.object({
  name:              z.string().min(1, "Product name is required").max(200),
  description:       z.string().max(1000).optional(),
  sku:               z.string().max(100).optional(),
  barcode:           z.string().max(100).optional(),
  categoryId:        z.string().optional(),
  taxGroupId:        z.string().optional(),
  costPrice:         z.coerce.number().min(0).optional(),
  sellingPrice:      z.coerce.number().min(0).optional(),
  stock:             z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  hasVariants:       z.coerce.boolean().default(false),
  isActive:          z.coerce.boolean().default(true),
});

const variantSchema = z.object({
  name:              z.string().min(1, "Variant name is required").max(200),
  sku:               z.string().max(100).optional(),
  barcode:           z.string().max(100).optional(),
  costPrice:         z.coerce.number().min(0).optional(),
  sellingPrice:      z.coerce.number().min(0).optional(),
  stock:             z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  isActive:          z.coerce.boolean().default(true),
});

/* ══════════════════════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════════════════════ */

export async function createProductAction(
  siteId: string | null,
  formData: FormData
): Promise<CreateResult> {
  try {
    const identity = await resolveIdentity(siteId);

    const parsed = productSchema.safeParse({
      name:              formData.get("name"),
      description:       formData.get("description")       || undefined,
      sku:               formData.get("sku")               || undefined,
      barcode:           formData.get("barcode")           || undefined,
      categoryId:        formData.get("categoryId")        || undefined,
      taxGroupId:        formData.get("taxGroupId")        || undefined,
      costPrice:         formData.get("costPrice")         || undefined,
      sellingPrice:      formData.get("sellingPrice")      || undefined,
      stock:             formData.get("stock")             ?? 0,
      lowStockThreshold: formData.get("lowStockThreshold") || undefined,
      hasVariants:       formData.get("hasVariants") === "true",
      isActive:          formData.get("isActive") !== "false",
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // SKU uniqueness per site
    if (parsed.data.sku) {
      const existing = await prisma.product.findFirst({
        where: { masterProfileId: identity.masterProfileId, siteId, sku: parsed.data.sku, deletedAt: null },
      });
      if (existing) return { success: false, error: `SKU "${parsed.data.sku}" already exists` };
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        // When hasVariants, clear price/stock from parent — lives on variants
        costPrice:    parsed.data.hasVariants ? null : (parsed.data.costPrice    ?? null),
        sellingPrice: parsed.data.hasVariants ? null : (parsed.data.sellingPrice ?? null),
        stock:        parsed.data.hasVariants ? 0    :  parsed.data.stock,
        categoryId:   parsed.data.categoryId  ?? null,
        taxGroupId:   parsed.data.taxGroupId  ?? null,
        sku:          parsed.data.sku         ?? null,
        barcode:      parsed.data.barcode     ?? null,
        lowStockThreshold: parsed.data.lowStockThreshold ?? null,
        isGlobal:     siteId === null,
        masterProfileId: identity.masterProfileId,
        siteId,
      },
    });

    revalidateProduct(siteId, product.id);
    return { success: true, productId: product.id };
  } catch (e) {
    return { success: false, error: "Failed to create product" };
  }
}

export async function updateProductAction(
  productId: string,
  siteId: string | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);

    const product = await prisma.product.findFirst({
      where: { id: productId, masterProfileId: identity.masterProfileId, deletedAt: null },
    });
    if (!product) return { success: false, error: "Product not found" };

    const parsed = productSchema.safeParse({
      name:              formData.get("name"),
      description:       formData.get("description")       || undefined,
      sku:               formData.get("sku")               || undefined,
      barcode:           formData.get("barcode")           || undefined,
      categoryId:        formData.get("categoryId")        || undefined,
      taxGroupId:        formData.get("taxGroupId")        || undefined,
      costPrice:         formData.get("costPrice")         || undefined,
      sellingPrice:      formData.get("sellingPrice")      || undefined,
      stock:             formData.get("stock")             ?? 0,
      lowStockThreshold: formData.get("lowStockThreshold") || undefined,
      hasVariants:       formData.get("hasVariants") === "true",
      isActive:          formData.get("isActive") !== "false",
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // SKU uniqueness excluding self
    if (parsed.data.sku) {
      const existing = await prisma.product.findFirst({
        where: {
          masterProfileId: identity.masterProfileId,
          siteId,
          sku:       parsed.data.sku,
          deletedAt: null,
          id:        { not: productId },
        },
      });
      if (existing) return { success: false, error: `SKU "${parsed.data.sku}" already exists` };
    }

    await prisma.product.update({
      where: { id: productId },
      data:  {
        ...parsed.data,
        costPrice:    parsed.data.hasVariants ? null : (parsed.data.costPrice    ?? null),
        sellingPrice: parsed.data.hasVariants ? null : (parsed.data.sellingPrice ?? null),
        stock:        parsed.data.hasVariants ? 0    :  parsed.data.stock,
        categoryId:   parsed.data.categoryId  ?? null,
        taxGroupId:   parsed.data.taxGroupId  ?? null,
        sku:          parsed.data.sku         ?? null,
        barcode:      parsed.data.barcode     ?? null,
        lowStockThreshold: parsed.data.lowStockThreshold ?? null,
      },
    });

    revalidateProduct(siteId, productId);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update product" };
  }
}

export async function softDeleteProductAction(
  productId: string,
  siteId: string | null
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);

    if (identity.type === "staff") {
      const product = await prisma.product.findFirst({
        where: { id: productId, masterProfileId: identity.masterProfileId, isGlobal: true },
      });
      if (product) return { success: false, error: "Staff cannot delete global products" };
    }

    await prisma.product.update({
      where: { id: productId },
      data:  { deletedAt: new Date() },
    });

    revalidateProduct(siteId);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete product" };
  }
}

export async function pushProductsToSitesAction(
  productIds: string[],
  targetSiteIds: string[]
): Promise<ActionResult> {
  try {
    const masterResult = await getMasterProfile();
    if (!masterResult) throw new Error("Unauthorized");
    const { masterProfile } = masterResult;

    const sources = await prisma.product.findMany({
      where:   { id: { in: productIds }, masterProfileId: masterProfile.id, deletedAt: null },
      include: { images: true, variants: { where: { deletedAt: null } } },
    });

    for (const targetSiteId of targetSiteIds) {
      for (const src of sources) {
        // Skip if already pushed to this site (match by name + sku)
        const exists = await prisma.product.findFirst({
          where: {
            masterProfileId: masterProfile.id,
            siteId:          targetSiteId,
            name:            src.name,
            deletedAt:       null,
          },
        });
        if (exists) continue;

        const pushed = await prisma.product.create({
          data: {
            name:              src.name,
            description:       src.description,
            sku:               src.sku,
            barcode:           src.barcode,
            categoryId:        src.categoryId,
            taxGroupId:        src.taxGroupId,
            costPrice:         src.costPrice,
            sellingPrice:      src.sellingPrice,
            stock:             src.stock,
            lowStockThreshold: src.lowStockThreshold,
            hasVariants:       src.hasVariants,
            isActive:          src.isActive,
            isGlobal:          true,
            masterProfileId:   masterProfile.id,
            siteId:            targetSiteId,
          },
        });

        // Push variants if any
        if (src.hasVariants && src.variants.length > 0) {
          await prisma.productVariant.createMany({
            data: src.variants.map((v) => ({
              name:              v.name,
              sku:               v.sku,
              barcode:           v.barcode,
              costPrice:         v.costPrice,
              sellingPrice:      v.sellingPrice,
              stock:             v.stock,
              lowStockThreshold: v.lowStockThreshold,
              isActive:          v.isActive,
              productId:         pushed.id,
            })),
          });
        }

        // Push images (copy URLs — no need to re-upload)
        if (src.images.length > 0) {
          await prisma.productImage.createMany({
            data: src.images.map((img) => ({
              url:         img.url,
              storagePath: img.storagePath,
              sortOrder:   img.sortOrder,
              productId:   pushed.id,
            })),
          });
        }
      }
    }

    revalidatePath("/dashboard/manage/products");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to push products to sites" };
  }
}

/* ══════════════════════════════════════════════════════════════
   VARIANTS
══════════════════════════════════════════════════════════════ */

export async function createVariantAction(
  productId: string,
  siteId: string | null,
  formData: FormData
): Promise<VariantCreateResult> {
  try {
    const identity = await resolveIdentity(siteId);

    const product = await prisma.product.findFirst({
      where: { id: productId, masterProfileId: identity.masterProfileId, deletedAt: null },
    });
    if (!product)              return { success: false, error: "Product not found" };
    if (!product.hasVariants)  return { success: false, error: "Product does not use variants" };

    const parsed = variantSchema.safeParse({
      name:              formData.get("name"),
      sku:               formData.get("sku")               || undefined,
      barcode:           formData.get("barcode")           || undefined,
      costPrice:         formData.get("costPrice")         || undefined,
      sellingPrice:      formData.get("sellingPrice")      || undefined,
      stock:             formData.get("stock")             ?? 0,
      lowStockThreshold: formData.get("lowStockThreshold") || undefined,
      isActive:          formData.get("isActive") !== "false",
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const variant = await prisma.productVariant.create({
      data: {
        ...parsed.data,
        sku:               parsed.data.sku               ?? null,
        barcode:           parsed.data.barcode           ?? null,
        costPrice:         parsed.data.costPrice         ?? null,
        sellingPrice:      parsed.data.sellingPrice      ?? null,
        lowStockThreshold: parsed.data.lowStockThreshold ?? null,
        productId,
      },
    });

    revalidateProduct(siteId, productId);
    return { success: true, variantId: variant.id };
  } catch (e) {
    return { success: false, error: "Failed to create variant" };
  }
}

export async function updateVariantAction(
  variantId: string,
  productId: string,
  siteId: string | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId, product: { masterProfileId: identity.masterProfileId } },
    });
    if (!variant) return { success: false, error: "Variant not found" };

    const parsed = variantSchema.safeParse({
      name:              formData.get("name"),
      sku:               formData.get("sku")               || undefined,
      barcode:           formData.get("barcode")           || undefined,
      costPrice:         formData.get("costPrice")         || undefined,
      sellingPrice:      formData.get("sellingPrice")      || undefined,
      stock:             formData.get("stock")             ?? 0,
      lowStockThreshold: formData.get("lowStockThreshold") || undefined,
      isActive:          formData.get("isActive") !== "false",
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    await prisma.productVariant.update({
      where: { id: variantId },
      data:  {
        ...parsed.data,
        sku:               parsed.data.sku               ?? null,
        barcode:           parsed.data.barcode           ?? null,
        costPrice:         parsed.data.costPrice         ?? null,
        sellingPrice:      parsed.data.sellingPrice      ?? null,
        lowStockThreshold: parsed.data.lowStockThreshold ?? null,
      },
    });

    revalidateProduct(siteId, productId);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update variant" };
  }
}

export async function deleteVariantAction(
  variantId: string,
  productId: string,
  siteId: string | null
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId, product: { masterProfileId: identity.masterProfileId } },
    });
    if (!variant) return { success: false, error: "Variant not found" };

    await prisma.productVariant.update({
      where: { id: variantId },
      data:  { deletedAt: new Date() },
    });

    revalidateProduct(siteId, productId);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete variant" };
  }
}

/* ══════════════════════════════════════════════════════════════
   IMAGES
══════════════════════════════════════════════════════════════ */

export async function addProductImageAction(
  productId: string,
  siteId: string | null,
  url: string,
  storagePath: string,
  sortOrder: number
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);

    const product = await prisma.product.findFirst({
      where: { id: productId, masterProfileId: identity.masterProfileId, deletedAt: null },
    });
    if (!product) return { success: false, error: "Product not found" };

    await prisma.productImage.create({
      data: { url, storagePath, sortOrder, productId },
    });

    revalidateProduct(siteId, productId);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to save image" };
  }
}

export async function deleteProductImageAction(
  imageId: string,
  siteId: string | null
): Promise<ActionResult> {
  try {
    const identity = await resolveIdentity(siteId);

    const image = await prisma.productImage.findFirst({
      where:   { id: imageId, product: { masterProfileId: identity.masterProfileId } },
      include: { product: true },
    });
    if (!image) return { success: false, error: "Image not found" };

    // Delete from Supabase Storage
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.storage.from("product-images").remove([image.storagePath]);

    await prisma.productImage.delete({ where: { id: imageId } });

    revalidateProduct(siteId, image.productId);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete image" };
  }
}

export async function reorderProductImagesAction(
  imageIds: string[],         // ordered array — index = new sortOrder
  siteId: string | null
): Promise<ActionResult> {
  try {
    await Promise.all(
      imageIds.map((id, index) =>
        prisma.productImage.update({ where: { id }, data: { sortOrder: index } })
      )
    );
    revalidateProduct(siteId);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to reorder images" };
  }
}

/* ══════════════════════════════════════════════════════════════
   SKU GENERATOR
   Auto-generates SKU if user doesn't provide one
══════════════════════════════════════════════════════════════ */

export async function generateSkuAction(
  masterProfileId: string,
  productName: string
): Promise<{ sku: string }> {
  const prefix = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");

  const count = await prisma.product.count({ where: { masterProfileId } });
  const sku = `${prefix}-${String(count + 1).padStart(4, "0")}`;
  return { sku };
}