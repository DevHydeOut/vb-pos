import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const modules = [
  {
    key: "inventory",
    label: "Stock Management",
    sortOrder: 1,
    pages: [
      { key: "inventory.stock", label: "Stock", sortOrder: 1 },
      { key: "inventory.adjust", label: "Stock Entry", sortOrder: 2 },
      { key: "inventory.transfers", label: "Site Transfers", sortOrder: 3 },
    ],
  },
  {
    key: "billing",
    label: "Billing System",
    sortOrder: 2,
    pages: [
      { key: "billing.pos", label: "POS Billing", sortOrder: 1 },
    ],
  },
  {
    key: "loyalty",
    label: "Royalty Points",
    sortOrder: 3,
    pages: [
      { key: "loyalty.customers", label: "Customer Points", sortOrder: 1 },
      { key: "loyalty.rewards", label: "Rewards", sortOrder: 2 },
    ],
  },
];

async function main() {
  console.log("Seeding core POS modules...");

  for (const mod of modules) {
    const module = await prisma.module.upsert({
      where: { key: mod.key },
      update: { label: mod.label, sortOrder: mod.sortOrder },
      create: { key: mod.key, label: mod.label, sortOrder: mod.sortOrder },
    });

    for (const page of mod.pages) {
      await prisma.page.upsert({
        where: { key: page.key },
        update: { label: page.label, sortOrder: page.sortOrder, moduleId: module.id },
        create: { ...page, moduleId: module.id },
      });
    }
  }

  console.log("Done. The app now exposes Stock Management, Billing System, and Royalty Points.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
