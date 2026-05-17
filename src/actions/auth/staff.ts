"use server";

import { prisma }           from "@/lib/prisma";
import { staffLoginSchema } from "@/lib/validators/staff";
import { cookies, headers } from "next/headers";
import { redirect }         from "next/navigation";
import { ROUTES }           from "@/routes";
import { verify }           from "@node-rs/argon2";

const STAFF_SESSION_COOKIE = "staff_session";
const SESSION_DURATION_MS  = 60 * 60 * 1000; // 1 hour idle session
const MAX_ATTEMPTS         = 3;
const LOCKOUT_MINUTES      = 15;
const LOCKOUT_MS           = LOCKOUT_MINUTES * 60 * 1000;

/* ── DB-backed rate limiter ─────────────────────────────────
   Stored in LoginAttempt table so it survives hot-reloads,
   server restarts, and multi-instance deployments.
──────────────────────────────────────────────────────────── */

async function getRLKey(ip: string, accountId: string, username: string) {
  return `${ip}::${accountId}::${username}`;
}

async function checkLocked(key: string): Promise<{ locked: boolean; minutesLeft: number }> {
  const record = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!record?.lockedUntil) return { locked: false, minutesLeft: 0 };

  if (record.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 60_000);
    return { locked: true, minutesLeft };
  }

  // Lockout expired — reset the record
  await prisma.loginAttempt.delete({ where: { key } });
  return { locked: false, minutesLeft: 0 };
}

async function recordFail(key: string): Promise<{ attemptsLeft: number; nowLocked: boolean }> {
  const record = await prisma.loginAttempt.upsert({
    where:  { key },
    create: { key, attempts: 1, lockedUntil: null },
    update: { attempts: { increment: 1 } },
  });

  if (record.attempts >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_MS);
    await prisma.loginAttempt.update({
      where:  { key },
      data:   { lockedUntil },
    });
    return { attemptsLeft: 0, nowLocked: true };
  }

  return { attemptsLeft: MAX_ATTEMPTS - record.attempts, nowLocked: false };
}

async function clearRL(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } }).catch(() => {});
}

/* ── Helpers ────────────────────────────────────────────── */

async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/* ── Types ──────────────────────────────────────────────── */

type LoginResult =
  | { success: true }
  | { success: false; error: string; attemptsLeft?: number; lockedFor?: number };

/* ── Staff Login ────────────────────────────────────────── */

export async function staffLoginAction(formData: FormData): Promise<LoginResult> {
  const raw = {
    accountId: formData.get("accountId") as string,
    username:  formData.get("username")  as string,
    password:  formData.get("password")  as string,
  };

  const parsed = staffLoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { accountId, username, password } = parsed.data;

  const ip    = await getClientIp();
  const rlKey = await getRLKey(ip, accountId, username);

  // ── Check if locked ──────────────────────────────────────
  const { locked, minutesLeft } = await checkLocked(rlKey);
  if (locked) {
    return {
      success:   false,
      error:     `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`,
      lockedFor: minutesLeft,
    };
  }

  // ── Lookup ───────────────────────────────────────────────
  const masterProfile = await prisma.masterProfile.findUnique({
    where: { accountId },
  });

  if (!masterProfile) {
    const { attemptsLeft, nowLocked } = await recordFail(rlKey);
    return {
      success:      false,
      error:        nowLocked
        ? `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`
        : "Invalid credentials",
      attemptsLeft: nowLocked ? 0 : attemptsLeft,
      ...(nowLocked && { lockedFor: LOCKOUT_MINUTES }),
    };
  }

  const subUser = await prisma.subUser.findUnique({
    where: {
      masterProfileId_username: { masterProfileId: masterProfile.id, username },
    },
    include: {
      sites: {
        include: { site: true },
        where:   { site: { isActive: true } },
      },
    },
  });

  if (!subUser) {
    const { attemptsLeft, nowLocked } = await recordFail(rlKey);
    return {
      success:      false,
      error:        nowLocked
        ? `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`
        : "Invalid credentials",
      attemptsLeft: nowLocked ? 0 : attemptsLeft,
      ...(nowLocked && { lockedFor: LOCKOUT_MINUTES }),
    };
  }

  // ── Verify password ──────────────────────────────────────
  const validPassword = await verify(subUser.password, password);
  if (!validPassword) {
    const { attemptsLeft, nowLocked } = await recordFail(rlKey);
    return {
      success:      false,
      error:        nowLocked
        ? `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`
        : "Invalid credentials",
      attemptsLeft: nowLocked ? 0 : attemptsLeft,
      ...(nowLocked && { lockedFor: LOCKOUT_MINUTES }),
    };
  }

  // ── Site check ───────────────────────────────────────────
  if (subUser.sites.length === 0) {
    return { success: false, error: "No active sites assigned. Contact your administrator." };
  }

  // ── Success — clear rate limit + create session ──────────
  await clearRL(rlKey);

  const token     = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.staffSession.create({
    data: {
      token,
      subUserId:       subUser.id,
      masterProfileId: masterProfile.id,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires:  expiresAt,
    path:     "/",
  });

  prisma.auditLog.create({
    data: {
      subUserId:    subUser.id,
      siteId:       subUser.sites[0].siteId,
      action:       "STAFF_LOGIN",
      module:       "auth",
      masterUserId: masterProfile.userId,
    },
  }).catch(console.error);

  return { success: true };
}

/* ── Get Staff Session ──────────────────────────────────── */

export async function getStaffSession() {
  const cookieStore = await cookies();
  const token       = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.staffSession.findUnique({
    where:   { token },
    include: {
      subUser: {
        include: {
          sites: {
            include: { site: true },
            where:   { site: { isActive: true } },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.staffSession.delete({ where: { token } });
    cookieStore.delete(STAFF_SESSION_COOKIE);
    return null;
  }

  const refreshedExpiry = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.staffSession.update({
    where: { token },
    data: { expiresAt: refreshedExpiry },
  });
  cookieStore.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: refreshedExpiry,
    path: "/",
  });

  return { ...session, expiresAt: refreshedExpiry };
}

/* ── Staff Sign Out ─────────────────────────────────────── */

export async function staffSignOutAction() {
  const cookieStore = await cookies();
  const token       = cookieStore.get(STAFF_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.staffSession.deleteMany({ where: { token } });
    cookieStore.delete(STAFF_SESSION_COOKIE);
  }

  redirect(ROUTES.auth.login);
}
