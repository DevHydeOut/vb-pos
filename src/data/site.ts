import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { notFound }         from "next/navigation";

// Get all sites for the current master user
export async function getSites() {
  const { masterProfile } = await getMasterProfile();

  const sites = await prisma.site.findMany({
    where:   { masterProfileId: masterProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { subUserSites: true }, // staff count per site
      },
    },
  });

  return { sites, masterProfile };
}

// Get a single site — verifies it belongs to the current master user
export async function getSite(siteId: string) {
  const { masterProfile, session } = await getMasterProfile();

  const site = await prisma.site.findFirst({
    where: {
      id:              siteId,
      masterProfileId: masterProfile.id,
    },
  });

  if (!site) notFound();

  return { site, masterProfile, session };
}