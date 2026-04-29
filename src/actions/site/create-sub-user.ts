"use server";

import { prisma }           from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { hash }             from "@node-rs/argon2";
import { z }                from "zod";

const schema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters").max(100),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores")
    .trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type CreateResult =
  | { success: true; subUserId: string; username: string }
  | { success: false; error: string };

export async function createSubUserAction(formData: FormData): Promise<CreateResult> {
  const { masterProfile } = await getMasterProfile();

  const parsed = schema.safeParse({
    name:     formData.get("name"),
    username: (formData.get("username") as string)?.toLowerCase().trim(),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Check username not already taken within this company
  const existing = await prisma.subUser.findUnique({
    where: {
      masterProfileId_username: {
        masterProfileId: masterProfile.id,
        username:        parsed.data.username,
      },
    },
  });
  if (existing) {
    return { success: false, error: "Username already taken in your account" };
  }

  const hashedPassword = await hash(parsed.data.password);

  const subUser = await prisma.subUser.create({
    data: {
      name:            parsed.data.name,
      username:        parsed.data.username,
      password:        hashedPassword,
      masterProfileId: masterProfile.id,
      isActive:        true,
    },
  });

  return { success: true, subUserId: subUser.id, username: subUser.username };
}