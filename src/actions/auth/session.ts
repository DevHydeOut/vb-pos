"use server";

import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

const STAFF_SESSION_COOKIE = "staff_session";

export async function logoutCurrentSessionAction() {
  const cookieStore = await cookies();
  const staffToken = cookieStore.get(STAFF_SESSION_COOKIE)?.value;

  if (staffToken) {
    await prisma.staffSession.deleteMany({ where: { token: staffToken } });
    cookieStore.delete(STAFF_SESSION_COOKIE);
  }

  await auth.api.signOut({ headers: await headers() }).catch(() => {});
  return { success: true as const };
}
