"use server";

// src/actions/portal/notifications.ts

import { revalidatePath } from "next/cache";
import { prisma }         from "@/lib/prisma";
import { getMasterProfile } from "@/data/master";
import { getStaffSession }  from "@/actions/auth/staff";

async function resolveIdentity(siteId: string) {
  const masterResult = await getMasterProfile().catch(() => null);
  if (masterResult) return { masterProfileId: masterResult.masterProfile.id, isMaster: true };
  const staffSession = await getStaffSession().catch(() => null);
  if (staffSession) {
    const site = await prisma.site.findFirst({ where: { id: siteId } });
    if (!site) return null;
    return { masterProfileId: site.masterProfileId, isMaster: false };
  }
  return null;
}

// ── Create a notification (called internally by transfer actions) ──

export async function createNotificationAction(data: {
  type:           string;
  title:          string;
  message:        string;
  siteId:         string;
  masterProfileId: string;
  actionUrl?:     string;
  referenceId?:   string;
  referenceType?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        type:            data.type as never,
        title:           data.title,
        message:         data.message,
        siteId:          data.siteId,
        masterProfileId: data.masterProfileId,
        actionUrl:       data.actionUrl  ?? null,
        referenceId:     data.referenceId  ?? null,
        referenceType:   data.referenceType ?? null,
      },
    });
  } catch (e) {
    // Fire-and-forget — never block main action
    console.error("Failed to create notification:", e);
  }
}

// ── Fetch notifications for a site ──────────────────────────

export async function getNotificationsAction(siteId: string) {
  try {
    const identity = await resolveIdentity(siteId);
    if (!identity) return { success: false as const, error: "Unauthorized" };

    const notifications = await prisma.notification.findMany({
      where:   { siteId, masterProfileId: identity.masterProfileId },
      orderBy: { createdAt: "desc" },
      take:    50,
    });

    const unreadCount = await prisma.notification.count({
      where: { siteId, masterProfileId: identity.masterProfileId, isRead: false },
    });

    return { success: true as const, notifications, unreadCount };
  } catch (e) {
    console.error(e);
    return { success: false as const, error: "Failed to load notifications" };
  }
}

// ── Mark one notification as read ───────────────────────────

export async function markNotificationReadAction(notificationId: string, siteId: string) {
  try {
    const identity = await resolveIdentity(siteId);
    if (!identity) return { success: false as const, error: "Unauthorized" };

    await prisma.notification.update({
      where: { id: notificationId },
      data:  { isRead: true, readAt: new Date() },
    });

    revalidatePath(`/portal/${siteId}`);
    return { success: true as const };
  } catch (e) {
    console.error(e);
    return { success: false as const, error: "Failed to mark read" };
  }
}

// ── Mark ALL notifications as read ──────────────────────────

export async function markAllNotificationsReadAction(siteId: string) {
  try {
    const identity = await resolveIdentity(siteId);
    if (!identity) return { success: false as const, error: "Unauthorized" };

    await prisma.notification.updateMany({
      where: { siteId, masterProfileId: identity.masterProfileId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });

    revalidatePath(`/portal/${siteId}`);
    return { success: true as const };
  } catch (e) {
    console.error(e);
    return { success: false as const, error: "Failed to mark all read" };
  }
}

// ── Unread count only (used for badge in layout) ────────────

export async function getUnreadNotificationCountAction(siteId: string, masterProfileId: string) {
  try {
    const count = await prisma.notification.count({
      where: { siteId, masterProfileId, isRead: false },
    });
    return count;
  } catch {
    return 0;
  }
}