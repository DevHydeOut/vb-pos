import { NextRequest } from "next/server";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function monthBounds(month: string) {
  const [year, rawMonth] = month.split("-").map(Number);
  return {
    start: new Date(year, rawMonth - 1, 1),
    end: new Date(year, rawMonth, 1),
  };
}

export async function GET(request: NextRequest) {
  const result = await getMasterProfile().catch(() => null);
  if (!result) return new Response("Unauthorized", { status: 401 });

  const monthParam = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : new Date().toISOString().slice(0, 7);
  const siteId = request.nextUrl.searchParams.get("siteId") ?? "all";
  const paymentParam = request.nextUrl.searchParams.get("paymentMethod") ?? "all";
  const paymentMethod = ["all", "CASH", "CARD", "ONLINE"].includes(paymentParam) ? paymentParam : "all";
  const { start, end } = monthBounds(month);

  const orders = await prisma.saleOrder.findMany({
    where: {
      masterProfileId: result.masterProfile.id,
      createdAt: { gte: start, lt: end },
      ...(siteId !== "all" ? { siteId } : {}),
      ...(paymentMethod !== "all" ? { paymentMethod } : {}),
    },
    include: {
      site: { select: { name: true } },
      customer: { select: { name: true, phone: true } },
      items: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = [
    ["Reference", "Date", "Site", "Customer", "Phone", "Payment", "Items", "Subtotal", "Item Discount", "Reward Discount", "Tax", "Total", "Points Earned"],
    ...orders.map((order) => [
      order.referenceNo,
      order.createdAt.toISOString(),
      order.site.name,
      order.customer.name,
      order.customer.phone,
      order.paymentMethod,
      order.items.reduce((sum, item) => sum + item.quantity, 0),
      order.subtotal,
      order.itemDiscountTotal,
      order.rewardDiscountTotal,
      order.taxTotal,
      order.grandTotal,
      order.pointsEarned,
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="monthly-sales-${month}.csv"`,
    },
  });
}
