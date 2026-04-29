"use client";

import { useState, useTransition } from "react";
import { toast }   from "sonner";
import {
  updateSubUserProfileAction,
  changeSubUserPasswordAction,
} from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { User, Phone, Lock, Eye, EyeOff, Loader2, Camera } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface SubUserData {
  id:        string;
  name:      string | null;
  username:  string;
  phone:     string | null;
  avatarUrl: string | null;
  language:  string;
}

/* ── Avatar ─────────────────────────────────────────────────── */

function AvatarSection({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-foreground flex items-center
          justify-center overflow-hidden shrink-0">
          {avatarUrl
            ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            : <span className="text-2xl font-bold text-background">{initials}</span>
          }
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl
          bg-background border border-border flex items-center justify-center
          shadow-sm cursor-pointer hover:bg-muted transition-colors">
          <Camera className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-foreground text-lg">{name || "—"}</p>
        <p className="text-sm text-muted-foreground">@{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Click the camera icon to change your avatar
        </p>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function SubUserProfileClient({ user }: { user: SubUserData }) {
  const [isPending,  startTransition]  = useTransition();
  const [isPwPending, startPwTransition] = useTransition();

  // Profile fields
  const [name,  setName]  = useState(user.name  ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");

  // Password fields
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);

  function handleProfileSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name",  name);
      fd.append("phone", phone);
      const res = await updateSubUserProfileAction(fd);
      if (res.success) toast.success("Profile updated.");
      else toast.error(res.error);
    });
  }

  function handlePasswordChange() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("currentPassword", currentPw);
      fd.append("newPassword",     newPw);
      const res = await changeSubUserPasswordAction(fd);
      if (res.success) {
        toast.success("Password changed.");
        setCurrentPw(""); setNewPw("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="max-w-xl space-y-10">

      {/* Avatar */}
      <AvatarSection name={name || user.username} avatarUrl={user.avatarUrl} />

      <div className="border-t border-border" />

      {/* ── Personal info ───────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Personal Info
        </h2>

        <div className="space-y-2">
          <Label>Username</Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={user.username} disabled className="h-11 pl-11 bg-muted/50" />
          </div>
          <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
        </div>

        <div className="space-y-2">
          <Label>Display Name</Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your full name" className="h-11 pl-11" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Phone
            <span className="text-muted-foreground text-xs font-normal ml-1">optional</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210" className="h-11 pl-11" />
          </div>
        </div>

        <Button onClick={handleProfileSave} disabled={isPending} className="w-full h-11">
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Profile
        </Button>
      </section>

      <div className="border-t border-border" />

      {/* ── Change password ─────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Change Password
        </h2>

        <div className="space-y-2">
          <Label>Current Password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type={showCurrent ? "text" : "password"}
              value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Enter current password" className="h-11 pl-11 pr-11" />
            <button type="button" onClick={() => setShowCurrent((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>New Password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type={showNew ? "text" : "password"}
              value={newPw} onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min. 6 characters" className="h-11 pl-11 pr-11" />
            <button type="button" onClick={() => setShowNew((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {newPw.length > 0 && newPw.length < 6 && (
            <p className="text-xs text-destructive">Password must be at least 6 characters</p>
          )}
        </div>

        <Button onClick={handlePasswordChange}
          disabled={isPwPending || !currentPw || newPw.length < 6}
          variant="outline" className="w-full h-11">
          {isPwPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Change Password
        </Button>
      </section>
    </div>
  );
}