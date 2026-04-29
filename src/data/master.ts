import { prisma } from "@/lib/prisma";
import { getSession } from "@/actions/auth/master";
import { redirect } from "next/navigation";
import { ROUTES } from "@/routes";

export async function getMasterProfile() {
  const session = await getSession();
  if (!session) redirect(ROUTES.auth.login);

  const masterProfile = await prisma.masterProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!masterProfile) redirect(ROUTES.auth.login);

  return { masterProfile, session };
}