import { z } from "zod";

export const staffLoginSchema = z.object({
  accountId: z
    .string()
    .min(1, "Account ID is required")
    .transform((v) => v.toUpperCase().trim()),
  username: z
    .string()
    .min(1, "Username is required")
    .trim(),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;