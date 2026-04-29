"use client";

// src/components/portal/customers/customer-form-client.tsx

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { toast }                   from "sonner";
import { Loader2, User, Phone, Mail, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/actions/portal/loyalty";

interface Customer {
  id:          string;
  name:        string;
  phone:       string;
  email:       string | null;
  dateOfBirth: Date | null;
  notes:       string | null;
  isActive:    boolean;
}

interface Props {
  customer?: Customer;
  siteId:    string | null;
  backUrl:   string;
}

export function CustomerFormClient({ customer, siteId, backUrl }: Props) {
  const router  = useRouter();
  const isEdit  = !!customer;
  const [isPending, startTransition] = useTransition();

  const [name,        setName]        = useState(customer?.name        ?? "");
  const [phone,       setPhone]       = useState(customer?.phone       ?? "");
  const [email,       setEmail]       = useState(customer?.email       ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    customer?.dateOfBirth
      ? new Date(customer.dateOfBirth).toISOString().split("T")[0]
      : ""
  );
  const [notes,    setNotes]    = useState(customer?.notes    ?? "");
  const [isActive, setIsActive] = useState(customer?.isActive ?? true);

  function handleSave() {
    if (!name.trim())  { toast.error("Name is required");         return; }
    if (!phone.trim()) { toast.error("Phone number is required"); return; }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("name",        name.trim());
      fd.append("phone",       phone.trim());
      fd.append("email",       email.trim());
      fd.append("dateOfBirth", dateOfBirth);
      fd.append("notes",       notes.trim());
      fd.append("isActive",    String(isActive));

      if (isEdit) {
        const res = await updateCustomerAction(customer.id, siteId, fd);
        if (res.success) {
          toast.success("Customer saved.");
          router.push(backUrl);
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createCustomerAction(siteId, fd);
        if (res.success) {
          toast.success("Customer created.");
          router.push(backUrl);
        } else {
          toast.error(res.error);
        }
      }
    });
  }

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Basic Info */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Customer Info
        </h2>

        <div className="space-y-2">
          <Label>Full Name <span className="text-destructive">*</span></Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Smith" className="h-11 pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Phone Number <span className="text-destructive">*</span>
            <span className="text-muted-foreground text-xs font-normal ml-1">
              Used to identify customer at checkout
            </span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900" className="h-11 pl-10"
              type="tel" autoComplete="off" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Email
            <span className="text-muted-foreground text-xs font-normal ml-1">optional</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com" className="h-11 pl-10"
              type="email" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Date of Birth
            <span className="text-muted-foreground text-xs font-normal ml-1">optional</span>
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-11 pl-10" type="date" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Notes
            <span className="text-muted-foreground text-xs font-normal ml-1">optional</span>
          </Label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this customer..."
              className="w-full min-h-20 pl-10 pr-4 py-3 border border-border rounded-xl
                bg-background text-sm resize-none focus:outline-none
                focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Status — only show on edit */}
      {isEdit && (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Status
            </h2>
            <button type="button" onClick={() => setIsActive((p) => !p)}
              className={`flex items-center gap-4 px-4 py-4 rounded-xl border w-full text-left
                transition-all ${isActive
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/30"}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                ${isActive ? "border-foreground bg-foreground" : "border-muted-foreground"}`}>
                {isActive && <div className="w-2 h-2 rounded-full bg-background" />}
              </div>
              <div>
                <p className="text-sm font-semibold">{isActive ? "Active" : "Inactive"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isActive ? "Customer can earn and redeem points" : "Customer is disabled"}
                </p>
              </div>
            </button>
          </section>
          <div className="border-t border-border" />
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push(backUrl)} className="flex-1 h-11">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isPending} className="flex-1 h-11">
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isEdit ? "Save Changes" : "Create Customer"}
        </Button>
      </div>
    </div>
  );
}