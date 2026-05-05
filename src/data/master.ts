import { prisma } from "@/lib/prisma";
import { getSession } from "@/actions/auth/master";
import { redirect } from "next/navigation";
import { ROUTES } from "@/routes";
import { generateAccountId } from "@/lib/utils";

export async function getMasterProfile() {
  const session = await getSession();
  if (!session) redirect(ROUTES.auth.login);

  let masterProfile = await prisma.masterProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!masterProfile) {
    masterProfile = await prisma.masterProfile.create({
      data: {
        userId: session.user.id,
        accountId: generateAccountId(),
      },
    });
  }

  return { masterProfile, session };
}
