import { CategoryFormClient } from "@/components/portal/inventory/category-form-client";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";
import { redirect } from "next/navigation";

export default async function ManageNewCategoryPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);

  const categoryTypes = await prisma.categoryType.findMany({
    where:   { masterProfileId: result.masterProfile.id },
    orderBy: { name: "asc" },
  });

  return (
    <CategoryFormClient
      siteId={null}
      isMaster={true}
      editingCategory={null}
      categoryTypes={categoryTypes}
      backUrl="/dashboard/manage/categories"
    />
  );
}