import { CategoryFormClient } from "@/components/portal/inventory/category-form-client";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { redirect, notFound } from "next/navigation";

export default async function ManageEditCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);

  const [category, categoryTypes] = await Promise.all([
    prisma.category.findFirst({
      where: {
        id:              categoryId,
        masterProfileId: result.masterProfile.id,
        siteId:          null,
        deletedAt:       null,
      },
      include: { type: true },
    }),
    prisma.categoryType.findMany({
      where:   { masterProfileId: result.masterProfile.id },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!category) notFound();

  return (
    <CategoryFormClient
      siteId={null}
      isMaster={true}
      editingCategory={category}
      categoryTypes={categoryTypes}
      backUrl="/dashboard/manage/categories"
    />
  );
}