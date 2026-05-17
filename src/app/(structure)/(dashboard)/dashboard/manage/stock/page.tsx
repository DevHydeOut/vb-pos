import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightLeft, Boxes, PackagePlus, Warehouse } from "lucide-react";
import { getMasterProfile } from "@/data/master";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/routes";

export default async function ManageStockPage() {
  const result = await getMasterProfile();
  if (!result) redirect(ROUTES.auth.login);

  const sites = await prisma.site.findMany({
    where: { masterProfileId: result.masterProfile.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true },
  });

  const actions = [
    { label: "Stock Levels", helper: "View current stock and low-stock items.", icon: Warehouse, href: ROUTES.staff.inventory.stock },
    { label: "Stock Entry", helper: "Receive stock or make stock corrections.", icon: PackagePlus, href: ROUTES.staff.inventory.adjust },
    { label: "Site Transfers", helper: "Send stock between sites and review transfer status.", icon: ArrowRightLeft, href: ROUTES.staff.inventory.transfers },
  ];

  return (
    <main className="max-w-6xl space-y-8 px-6 py-10">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Manage</p>
        <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
        <p className="text-sm text-muted-foreground">
          Choose a site, then open stock levels, stock entry, or stock transfers.
        </p>
      </div>

      <div className="grid gap-4">
        {sites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Boxes className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 font-medium">No active sites found</p>
            <p className="text-sm text-muted-foreground">Create a site before managing stock.</p>
          </div>
        ) : sites.map((site) => (
          <section key={site.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{site.name}</h2>
                <p className="text-sm text-muted-foreground">{site.address ?? "No address added"}</p>
              </div>
              <Link
                href={ROUTES.staff.site(site.id)}
                className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Open Site
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href(site.id)}
                    className="group rounded-xl border border-border p-4 transition hover:border-foreground/25 hover:bg-muted/30"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    <p className="mt-3 font-medium">{action.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.helper}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
