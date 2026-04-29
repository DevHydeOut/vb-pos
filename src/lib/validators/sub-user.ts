import { z } from "zod";

export const createSubUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores")
    .trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  // permissions passed as JSON string from form
  permissions: z.string().min(1, "Assign at least one site"),
});

export type CreateSubUserInput = z.infer<typeof createSubUserSchema>;