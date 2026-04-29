import { redirect }        from "next/navigation";
import { notFound }         from "next/navigation";
import { getStaffSession }  from "@/actions/auth/staff";
import { getMasterProfile } from "@/data/master";
import { prisma }           from "@/lib/prisma";
import { ROUTES }           from "@/routes";
import { CategoryFormClient } from "@/components/portal/inventory/category-form-client";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ siteId: string; categoryId: string }>;
}) {
  const { siteId, categoryId } = await params;

  const staffSession = await getStaffSession().catch(() => null);
  const masterResult = await getMasterProfile().catch(() => null);
  if (!staffSession && !masterResult) redirect(ROUTES.auth.login);

  const isMaster = !!masterResult && !staffSession;
  let masterProfileId: string;

  if (isMaster) {
    const site = await prisma.site.findFirst({
      where: { id: siteId, masterProfileId: masterResult!.masterProfile.id },
    });
    if (!site) notFound();
    masterProfileId = masterResult!.masterProfile.id;
  } else {
    const subUserSite = await prisma.subUserSite.findUnique({
      where: { subUserId_siteId: { subUserId: staffSession!.subUser.id, siteId } },
      include: { site: true, permissions: { include: { module: true, page: true } } },
    });
    if (!subUserSite || !subUserSite.site.isActive) notFound();
    const module = await prisma.module.findUnique({ where: { key: "inventory" } });
    const page   = await prisma.page.findUnique({ where: { key: "inventory.categories" } });
    const hasAccess = module && (
      subUserSite.permissions.some((p) => p.module?.id === module.id && !p.page) ||
      (page && subUserSite.permissions.some((p) => p.page?.id === page.id))
    );
    if (!hasAccess) notFound();
    masterProfileId = subUserSite.site.masterProfileId;
  }

  const [category, categoryTypes] = await Promise.all([
    prisma.category.findFirst({
      where:   { id: categoryId, masterProfileId, deletedAt: null },
      include: { type: true },
    }),
    prisma.categoryType.findMany({
      where:   { masterProfileId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!category) notFound();

  // Staff can't edit global categories
  if (!isMaster && category.isGlobal) notFound();

  return (
    <CategoryFormClient
      siteId={siteId}
      isMaster={isMaster}
      categoryTypes={categoryTypes}
      editingCategory={category}
      backUrl={`/portal/${siteId}/inventory/categories`}
    />
  );
}