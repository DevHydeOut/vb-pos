"use server";

import { revalidatePath } from "next/cache";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { fireEvent } from "@/lib/events";

export type ProductImportResult =
  | { success: true; created: number; updated: number; skipped: number; errors: string[] }
  | { success: false; error: string };

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.toLowerCase().trim());
  return rows.slice(1).map((values) => {
    const output: CsvRow = {};
    headers.forEach((header, index) => {
      output[header] = values[index]?.trim() ?? "";
    });
    return output;
  });
}

function parseNumber(value: string | undefined, fallback = 0) {
  if (!value) return fallback;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function findOrCreateCategory(masterProfileId: string, name: string) {
  if (!name.trim()) return null;

  const existing = await prisma.category.findFirst({
    where: { masterProfileId, siteId: null, name: name.trim(), deletedAt: null },
  });
  if (existing) return existing.id;

  const category = await prisma.category.create({
    data: {
      masterProfileId,
      name: name.trim(),
      isGlobal: true,
      color: "#64748b",
      icon: "tag",
    },
  });
  fireEvent({
    type: "CATEGORY_CREATED",
    categoryId: category.id,
    categoryName: category.name,
    siteId: null,
    masterProfileId,
  });
  return category.id;
}

export async function importProductsAction(formData: FormData): Promise<ProductImportResult> {
  try {
    const result = await getMasterProfile();
    if (!result) return { success: false, error: "Unauthorized" };

    const file = formData.get("file");
    const siteId = String(formData.get("siteId") ?? "global");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Upload a CSV file." };
    }

    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      return { success: false, error: "CSV must include headers and at least one product row." };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const masterProfileId = result.masterProfile.id;
    const targetSiteId = siteId === "global" ? null : siteId;

    if (targetSiteId) {
      const site = await prisma.site.findFirst({ where: { id: targetSiteId, masterProfileId, isActive: true } });
      if (!site) return { success: false, error: "Selected site was not found." };
    }

    for (const [index, row] of rows.entries()) {
      const line = index + 2;
      const name = row.name || row.product || row.product_name;
      if (!name) {
        skipped += 1;
        errors.push(`Line ${line}: missing product name.`);
        continue;
      }

      const sku = row.sku || undefined;
      const barcode = row.barcode || undefined;
      const categoryId = await findOrCreateCategory(masterProfileId, row.category || "");
      const sellingPrice = parseNumber(row.price || row.sellingprice || row.selling_price, 0);
      const costPrice = parseNumber(row.cost || row.costprice || row.cost_price, 0);
      const stock = Math.max(0, Math.floor(parseNumber(row.stock || row.quantity, 0)));
      const lowStockThreshold = Math.max(0, Math.floor(parseNumber(row.lowstock || row.low_stock || row.low_stock_threshold, 5)));

      const existing = sku || barcode
        ? await prisma.product.findFirst({
            where: {
              masterProfileId,
              deletedAt: null,
              OR: [
                ...(sku ? [{ sku }] : []),
                ...(barcode ? [{ barcode }] : []),
              ],
            },
          })
        : null;

      const data = {
        name: name.trim(),
        sku,
        barcode,
        categoryId,
        sellingPrice,
        costPrice,
        stock,
        lowStockThreshold,
        isActive: true,
        hasVariants: false,
        siteId: targetSiteId,
        isGlobal: !targetSiteId,
        masterProfileId,
      };

      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        const product = await prisma.product.create({ data });
        fireEvent({
          type: "PRODUCT_CREATED",
          productId: product.id,
          productName: product.name,
          siteId: targetSiteId,
          masterProfileId,
        });
        created += 1;
      }
    }

    revalidatePath("/dashboard/manage/products");
    revalidatePath("/dashboard/manage/products/import");
    if (targetSiteId) revalidatePath(`/portal/${targetSiteId}/inventory/products`);

    return { success: true, created, updated, skipped, errors: errors.slice(0, 10) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Import failed." };
  }
}
