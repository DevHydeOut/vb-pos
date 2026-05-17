import { redirect } from "next/navigation";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { ProductImportClient } from "@/components/dashboard/products/product-import-client";

export default async function ProductImportPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);

  const sites = await prisma.site.findMany({
    where: { masterProfileId: result.masterProfile.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="max-w-5xl space-y-8 px-6 py-10">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Stock Management</p>
        <h1 className="text-3xl font-bold tracking-tight">Import Products</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV product list to create or update global or site-level stock items.
        </p>
      </div>
      <ProductImportClient sites={sites} />
    </main>
  );
}
