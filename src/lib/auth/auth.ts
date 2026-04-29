import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { generateAccountId } from "@/lib/utils";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // Auto-create MasterProfile when a new user signs up via Google
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await prisma.masterProfile.create({
            data: {
              userId: user.id,
              accountId: generateAccountId(), // e.g. "ACC-482910"
            },
          });
        },
      },
    },
  },

  plugins: [nextCookies()], // Must be last — handles cookies in server actions
});