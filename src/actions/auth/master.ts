"use server";

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Get current session — use this in any server action or page
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Sign out
export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/login");
}