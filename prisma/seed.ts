import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
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
      { key: "inventory.products", label: "Products", sortOrder: 1 },
      { key: "inventory.stock", label: "Stock", sortOrder: 2 },
      { key: "inventory.adjust", label: "Stock Entry", sortOrder: 3 },
      { key: "inventory.transfers", label: "Site Transfers", sortOrder: 4 },
    ],
  },
  {
    key: "billing",
    label: "Billing System",
    sortOrder: 2,
    pages: [
      { key: "billing.pos", label: "POS Billing", sortOrder: 1 },
      { key: "billing.analytics", label: "Analytics", sortOrder: 2 },
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

const demoUserId = "demo-owner-user";
const demoAccountId = "DEMO-001";
const demoCurrencySymbol = "Rs.";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function seedModules() {
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
}

async function getDemoMaster() {
  await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: { name: "Demo Owner", updatedAt: new Date() },
    create: {
      id: demoUserId,
      name: "Demo Owner",
      email: "owner@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  let master = await prisma.masterProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!master) {
    master = await prisma.masterProfile.create({
      data: {
        userId: demoUserId,
        accountId: demoAccountId,
        businessName: "Demo POS Store",
        countryCode: "IN",
        currencyCode: "INR",
        currencySymbol: demoCurrencySymbol,
        profileComplete: true,
      },
    });
  } else {
    const accountOwner = await prisma.masterProfile.findUnique({ where: { accountId: demoAccountId } });
    await prisma.masterProfile.update({
      where: { id: master.id },
      data: {
        accountId: !accountOwner || accountOwner.id === master.id ? demoAccountId : master.accountId,
        businessName: master.businessName ?? "Demo POS Store",
        countryCode: master.countryCode ?? "IN",
        currencyCode: "INR",
        currencySymbol: demoCurrencySymbol,
        profileComplete: true,
      },
    });
    master = await prisma.masterProfile.findUniqueOrThrow({ where: { id: master.id } });
  }

  return master;
}

async function upsertCategory(input: {
  masterProfileId: string;
  name: string;
  color: string;
  icon: string;
}) {
  const existing = await prisma.category.findFirst({
    where: {
      masterProfileId: input.masterProfileId,
      name: input.name,
      siteId: null,
    },
  });

  if (existing) {
    return prisma.category.update({
      where: { id: existing.id },
      data: {
        isGlobal: true,
        isActive: true,
        deletedAt: null,
        color: input.color,
        icon: input.icon,
      },
    });
  }

  return prisma.category.create({
    data: {
      masterProfileId: input.masterProfileId,
      name: input.name,
      isGlobal: true,
      color: input.color,
      icon: input.icon,
    },
  });
}

async function seedDemoData(masterProfileId: string) {
  const [mainSite, kioskSite] = await Promise.all([
    prisma.site.upsert({
      where: { id: "demo-main-site" },
      update: { masterProfileId, name: "Main Store", isActive: true, currencySymbol: demoCurrencySymbol },
      create: {
        id: "demo-main-site",
        masterProfileId,
        name: "Main Store",
        address: "MG Road",
        phone: "+91 90000 00001",
        currencySymbol: demoCurrencySymbol,
      },
    }),
    prisma.site.upsert({
      where: { id: "demo-kiosk-site" },
      update: { masterProfileId, name: "Mall Kiosk", isActive: true, currencySymbol: demoCurrencySymbol },
      create: {
        id: "demo-kiosk-site",
        masterProfileId,
        name: "Mall Kiosk",
        address: "City Mall",
        phone: "+91 90000 00002",
        currencySymbol: demoCurrencySymbol,
      },
    }),
  ]);

  const [foodCategory, careCategory] = await Promise.all([
    upsertCategory({ masterProfileId, name: "Food", color: "#16a34a", icon: "package" }),
    upsertCategory({ masterProfileId, name: "Personal Care", color: "#2563eb", icon: "sparkles" }),
  ]);

  const gst = await prisma.taxGroup.upsert({
    where: { id: "demo-tax-gst-5" },
    update: { masterProfileId, name: "GST 5%", rate: 5, isActive: true, deletedAt: null },
    create: {
      id: "demo-tax-gst-5",
      masterProfileId,
      name: "GST 5%",
      rate: 5,
      description: "Demo GST rate",
      isDefault: true,
      isGlobal: true,
    },
  });

  const productInputs = [
    { id: "demo-product-coffee", name: "Cold Coffee", sku: "COF-001", barcode: "890100000001", categoryId: foodCategory.id, price: 120, stock: 70 },
    { id: "demo-product-sandwich", name: "Veg Sandwich", sku: "FOOD-002", barcode: "890100000002", categoryId: foodCategory.id, price: 90, stock: 45 },
    { id: "demo-product-shampoo", name: "Herbal Shampoo", sku: "CARE-001", barcode: "890100000003", categoryId: careCategory.id, price: 180, stock: 22 },
    { id: "demo-product-soap", name: "Aloe Soap", sku: "CARE-002", barcode: "890100000004", categoryId: careCategory.id, price: 55, stock: 8 },
  ];

  const products = [];
  for (const input of productInputs) {
    products.push(await prisma.product.upsert({
      where: { id: input.id },
      update: {
        masterProfileId,
        siteId: mainSite.id,
        isGlobal: false,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        categoryId: input.categoryId,
        taxGroupId: gst.id,
        sellingPrice: input.price,
        stock: input.stock,
        lowStockThreshold: 10,
        isActive: true,
        deletedAt: null,
      },
      create: {
        id: input.id,
        masterProfileId,
        siteId: mainSite.id,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        categoryId: input.categoryId,
        taxGroupId: gst.id,
        sellingPrice: input.price,
        costPrice: Math.round(input.price * 0.6),
        stock: input.stock,
        lowStockThreshold: 10,
        isActive: true,
      },
    }));
  }

  await prisma.product.updateMany({
    where: {
      masterProfileId,
      sku: "GAME-0001",
    },
    data: {
      name: "General Retail Item",
      sku: "GEN-0001",
      description: "Generic demo product",
      isActive: true,
      deletedAt: null,
    },
  });

  await prisma.loyaltyProgram.upsert({
    where: { masterProfileId },
    update: { isEnabled: true, pointsPerUnit: 1, unitValue: 10, pointsName: "Points" },
    create: { masterProfileId, isEnabled: true, pointsPerUnit: 1, unitValue: 10, pointsName: "Points" },
  });
  const loyaltyProgram = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { masterProfileId } });

  await prisma.loyaltyReward.upsert({
    where: { id: "demo-reward-100-off" },
    update: {
      masterProfileId,
      loyaltyProgramId: loyaltyProgram.id,
      name: "Rs.100 Off",
      type: "FIXED_DISCOUNT",
      pointsCost: 150,
      discountValue: 100,
      isActive: true,
      isGlobal: true,
      deletedAt: null,
    },
    create: {
      id: "demo-reward-100-off",
      masterProfileId,
      loyaltyProgramId: loyaltyProgram.id,
      name: "Rs.100 Off",
      description: "Demo fixed discount reward",
      type: "FIXED_DISCOUNT",
      pointsCost: 150,
      discountValue: 100,
      isGlobal: true,
    },
  });

  await prisma.loyaltyReward.upsert({
    where: { id: "demo-reward-free-coffee" },
    update: {
      masterProfileId,
      loyaltyProgramId: loyaltyProgram.id,
      productId: "demo-product-coffee",
      name: "Free Cold Coffee",
      type: "FREE_PRODUCT",
      pointsCost: 120,
      isActive: true,
      isGlobal: true,
      deletedAt: null,
    },
    create: {
      id: "demo-reward-free-coffee",
      masterProfileId,
      loyaltyProgramId: loyaltyProgram.id,
      productId: "demo-product-coffee",
      name: "Free Cold Coffee",
      description: "Redeem points for one cold coffee",
      type: "FREE_PRODUCT",
      pointsCost: 120,
      isGlobal: true,
    },
  });

  const customers = [];
  for (const input of [
    { phone: "9000000001", name: "Aarav Sharma", points: 240, spend: 6400 },
    { phone: "9000000002", name: "Meera Patel", points: 180, spend: 4200 },
    { phone: "9000000003", name: "Kabir Khan", points: 95, spend: 2100 },
  ]) {
    const customer = await prisma.customer.upsert({
      where: { masterProfileId_phone: { masterProfileId, phone: input.phone } },
      update: { name: input.name, isActive: true, deletedAt: null },
      create: { masterProfileId, phone: input.phone, name: input.name },
    });
    await prisma.customerLoyalty.upsert({
      where: { customerId: customer.id },
      update: { currentPoints: input.points, lifetimePoints: input.points + 300, lifetimeSpend: input.spend },
      create: { customerId: customer.id, currentPoints: input.points, lifetimePoints: input.points + 300, lifetimeSpend: input.spend },
    });
    customers.push(customer);
  }

  await prisma.saleOrder.deleteMany({
    where: { masterProfileId, referenceNo: { startsWith: "DEMO-BILL-" } },
  });

  const demoOrders = [
    { ref: "DEMO-BILL-001", days: 0, customer: customers[0], lines: [[products[0], 2], [products[1], 1]] as const },
    { ref: "DEMO-BILL-002", days: 1, customer: customers[1], lines: [[products[2], 1], [products[3], 3]] as const },
    { ref: "DEMO-BILL-003", days: 3, customer: customers[2], lines: [[products[0], 1], [products[3], 2]] as const },
    { ref: "DEMO-BILL-004", days: 6, customer: customers[0], lines: [[products[1], 2], [products[2], 1]] as const },
    { ref: "DEMO-BILL-005", days: 12, customer: customers[1], lines: [[products[0], 3]] as const },
  ];

  for (const order of demoOrders) {
    const items = order.lines.map(([product, quantity]) => {
      const unitPrice = product.sellingPrice ?? 0;
      const taxable = unitPrice * quantity;
      const taxAmount = Math.round(taxable * 5) / 100;
      return {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        discountType: "NONE",
        discountValue: 0,
        itemDiscount: 0,
        rewardDiscount: 0,
        taxRate: 5,
        taxAmount,
        lineTotal: taxable + taxAmount,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const grandTotal = subtotal + taxTotal;
    await prisma.saleOrder.create({
      data: {
        referenceNo: order.ref,
        customerId: order.customer.id,
        siteId: mainSite.id,
        masterProfileId,
        subtotal,
        taxTotal,
        grandTotal,
        pointsEarned: Math.floor(subtotal / 10),
        createdAt: daysAgo(order.days),
        createdBy: "demo-cashier",
        items: { create: items },
      },
    });
  }

  const password = await hash("demo1234");
  const staff = await prisma.subUser.upsert({
    where: { masterProfileId_username: { masterProfileId, username: "cashier" } },
    update: { password, name: "Demo Cashier", description: "Demo staff account for billing, stock and rewards testing.", isActive: true },
    create: { masterProfileId, username: "cashier", password, name: "Demo Cashier", description: "Demo staff account for billing, stock and rewards testing.", isActive: true },
  });

  const mainSubUserSite = await prisma.subUserSite.upsert({
    where: { subUserId_siteId: { subUserId: staff.id, siteId: mainSite.id } },
    update: { isDefault: true },
    create: { subUserId: staff.id, siteId: mainSite.id, isDefault: true },
  });

  const dbModules = await prisma.module.findMany({ where: { key: { in: modules.map((mod) => mod.key) } } });

  const kioskSubUserSite = await prisma.subUserSite.upsert({
    where: { subUserId_siteId: { subUserId: staff.id, siteId: kioskSite.id } },
    update: {},
    create: { subUserId: staff.id, siteId: kioskSite.id, isDefault: false },
  });

  for (const subUserSite of [mainSubUserSite, kioskSubUserSite]) {
    await prisma.permission.deleteMany({ where: { subUserSiteId: subUserSite.id } });
    await prisma.permission.createMany({
      data: dbModules.map((module) => ({ subUserSiteId: subUserSite.id, moduleId: module.id })),
    });
  }

  return {
    accountId: (await prisma.masterProfile.findUniqueOrThrow({ where: { id: masterProfileId } })).accountId,
  };
}

async function main() {
  console.log("Seeding modules and demo POS data...");
  await seedModules();
  const master = await getDemoMaster();
  const demo = await seedDemoData(master.id);
  console.log("Done.");
  console.log(`Staff demo login: account ${demo.accountId}, username cashier, password demo1234`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
