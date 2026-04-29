import { z } from "zod";

export const createSiteSchema = z.object({
  name: z
    .string()
    .min(2, "Site name must be at least 2 characters")
    .max(100, "Site name is too long"),

  address: z
    .string()
    .max(255, "Address is too long")
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{7,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),

  taxNumber: z
    .string()
    .max(50, "Tax/GST number is too long")
    .optional()
    .or(z.literal("")),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;