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

  // Single-user app: the first Google user creates the one master profile.
  // Later Google logins are treated as admin sessions by getMasterProfile().
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const existingMaster = await prisma.masterProfile.findFirst({
            orderBy: { createdAt: "asc" },
            select: { id: true },
          });
          if (existingMaster) return;

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
