"use client";

// src/components/portal/customers/customer-list-client.tsx

import { useState }     from "react";
import { useRouter }    from "next/navigation";
import {
  Search, Plus, Users, Phone, Mail,
  Star, TrendingUp, ChevronRight, X,
} from "lucide-react";
import { ROUTES } from "@/routes";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

interface Customer {
  id:             string;
  name:           string;
  phone:          string;
  email:          string | null;
  isActive:       boolean;
  createdAt:      Date;
  currentPoints:  number;
  lifetimePoints: number;
}

interface Props {
  customers:      Customer[];
  siteId:         string | null;
  loyaltyEnabled: boolean;
  pointsName:     string;
}

export function CustomerListClient({ customers, siteId, loyaltyEnabled, pointsName }: Props) {
  const router  = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = customers.filter((c) => {
    if (filter === "active"   && !c.isActive) return false;
    if (filter === "inactive" &&  c.isActive) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function goToCustomer(id: string) {
    if (siteId) router.push(ROUTES.staff.customer(siteId, id));
    else        router.push(`/dashboard/manage/customers/${id}`);
  }

  function goToNew() {
    if (siteId) router.push(ROUTES.staff.newCustomer(siteId));
    else        router.push("/dashboard/manage/customers/new");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <PageHeader title="Customers" description="Manage your customer database" />
        </div>
        <button
          onClick={goToNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background
            rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> New Customer
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full h-10 pl-10 pr-9 rounded-xl border border-border bg-background
              text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">
            {search || filter !== "all" ? "No customers match" : "No customers yet"}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            {search || filter !== "all"
              ? "Try a different search or filter"
              : "Add your first customer to get started"}
          </p>
          {!search && filter === "all" && (
            <button onClick={goToNew}
              className="mt-2 px-4 py-2 bg-foreground text-background rounded-xl text-sm font-medium">
              Add Customer
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => (
            <button
              key={customer.id}
              onClick={() => goToCustomer(customer.id)}
              className="w-full flex items-center gap-4 px-4 py-3.5 border border-border
                rounded-xl hover:bg-muted/50 transition-colors text-left group">

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center
                shrink-0 text-sm font-semibold text-muted-foreground">
                {customer.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  {!customer.isActive && (
                    <span className="shrink-0 px-1.5 py-0.5 bg-muted rounded text-xs
                      text-muted-foreground">Inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                      <Mail className="h-3 w-3" /> {customer.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Points */}
              {loyaltyEnabled && (
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="h-3.5 w-3.5 text-warning" />
                    <span className="text-sm font-semibold">{customer.currentPoints.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{pointsName}</p>
                </div>
              )}

              <ChevronRight className="h-4 w-4 text-muted-foreground
                group-hover:text-foreground transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {filtered.length} of {customers.length} customers
        </p>
      )}
    </div>
  );
}