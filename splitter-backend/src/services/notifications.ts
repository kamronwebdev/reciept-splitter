import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

/**
 * In-app notifications (the bell on Home).
 *
 * Every event goes through `notify()`, so push notifications can later be added in ONE place
 * (see `deliverPush`). A failure here must never break the request that triggered it.
 */
export const NOTIFICATION_TYPES = [
  "FRIEND_REQUEST", // someone sent you a friend request
  "FRIEND_ACCEPTED", // your request was accepted
  "FRIEND_ADDED", // someone added you by scanning your QR
  "GROUP_ADDED", // you were added to a group
  "GROUP_JOIN_REQUEST", // (owner/admins) someone asks to join your group
  "GROUP_JOIN_APPROVED", // your join request was approved
  "GROUP_ROLE_CHANGED", // you became / are no longer an admin
  "GROUP_REMOVED", // you were removed from a group
  "RECEIPT_INCLUDED", // you were included in a receipt (with your amount)
  "RECEIPT_PAID", // a share was marked as paid
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Who caused it (shown as the avatar); avatars are resolved fresh when listing. */
export type Actor = { uniqueId: string; username: string };

export type NotificationData = {
  actor?: Actor | undefined;
  groupId?: number;
  groupName?: string;
  sessionId?: number;
  sessionName?: string | null;
  amount?: number;
  currency?: string;
  role?: "ADMIN" | "MEMBER";
  paid?: boolean;
  /** uniqueId of the participant whose share changed (RECEIPT_PAID) */
  participantUniqueId?: string;
};

export async function notify(userIds: number | number[], type: NotificationType, data: NotificationData = {}) {
  const ids = Array.from(new Set(Array.isArray(userIds) ? userIds : [userIds])).filter((id) => Number.isInteger(id));
  if (!ids.length) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, type, data: data as Prisma.InputJsonObject })),
    });
    await deliverPush(ids, type, data);
  } catch (err) {
    console.error(`[notify] ${type} failed:`, (err as Error)?.message);
  }
}

/** Hook for push notifications (Expo push tokens) later; in-app only for now. */
async function deliverPush(_userIds: number[], _type: NotificationType, _data: NotificationData): Promise<void> {
  // intentionally empty
}

export async function actorOf(userId: number): Promise<Actor | undefined> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { uniqueId: true, username: true } });
  return u ?? undefined;
}
