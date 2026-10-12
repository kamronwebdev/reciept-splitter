import crypto from "node:crypto";
import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { publicBaseUrl, resolveAvatarUrl } from "../utils/avatar.js";

/**
 * Permanent personal friend QR codes.
 *
 * Every user gets one random, unguessable `inviteCode` (created lazily, can be reset). The QR holds the
 * https landing URL `<PUBLIC_BASE_URL>/f/<code>`: any phone camera opens a small page with a button that
 * deep-links into the app, and the in-app scanner reads the code straight from the URL.
 */

/** no 0/o/1/l/i: easy to read aloud and type */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const INVITE_CODE_LENGTH = 12; // 31^12 ≈ 7.9e17 (~59 bits)
export const APP_SCHEME = "receipt-splitter";

export function generateInviteCode(length = INVITE_CODE_LENGTH): string {
  const bytes = crypto.randomBytes(length * 2);
  let out = "";
  for (let i = 0; out.length < length && i < bytes.length; i++) {
    const b = bytes[i]!;
    // rejection sampling keeps the distribution uniform (248 = 31 * 8)
    if (b < 248) out += ALPHABET[b % ALPHABET.length];
  }
  return out.length === length ? out : generateInviteCode(length);
}

/** Normalizes user input / URL path segments; null when it can't be one of our codes. */
export function normalizeInviteCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase();
  return new RegExp(`^[${ALPHABET}]{${INVITE_CODE_LENGTH}}$`).test(code) ? code : null;
}

async function assignNewCode(userId: number): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { inviteCode: code } });
      return code;
    } catch (err: any) {
      if (err?.code !== "P2002") throw err; // unique collision: try another code
    }
  }
  throw new Error("Could not allocate a unique invite code");
}

export async function ensureInviteCode(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { inviteCode: true } });
  if (!user) throw new Error("User not found");
  return user.inviteCode ?? assignNewCode(userId);
}

export async function resetInviteCode(userId: number): Promise<string> {
  return assignNewCode(userId);
}

export function inviteLinks(code: string, req: Pick<Request, "protocol" | "get">) {
  return {
    code,
    url: `${publicBaseUrl(req)}/f/${code}`,
    deepLink: `${APP_SCHEME}://f/${code}`,
  };
}

export type FriendshipState = "none" | "pending_outgoing" | "pending_incoming" | "friends" | "self";

export async function friendshipState(me: number, other: number): Promise<FriendshipState> {
  if (me === other) return "self";
  const links = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: me, receiverId: other },
        { requesterId: other, receiverId: me },
      ],
    },
  });
  if (links.some((l) => l.status === "ACCEPTED")) return "friends";
  if (links.some((l) => l.status === "PENDING" && l.receiverId === me)) return "pending_incoming";
  if (links.some((l) => l.status === "PENDING" && l.requesterId === me)) return "pending_outgoing";
  return "none";
}

export type PublicUser = { id: number; uniqueId: string; username: string; avatarUrl: string | null };

export function publicCard(user: PublicUser, req: Pick<Request, "protocol" | "get">) {
  return { uniqueId: user.uniqueId, username: user.username, avatarUrl: resolveAvatarUrl(user.avatarUrl, req) };
}

export async function findUserByCode(code: string | null): Promise<PublicUser | null> {
  if (!code) return null;
  return prisma.user.findUnique({
    where: { inviteCode: code },
    select: { id: true, uniqueId: true, username: true, avatarUrl: true },
  });
}

/**
 * Makes `me` and `other` friends (scanning a QR in person = both agree). Accepts a pending request in
 * either direction; REJECTED rows are revived. Returns what happened.
 */
export async function befriend(me: number, other: number): Promise<"created" | "accepted" | "existing"> {
  const links = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: me, receiverId: other },
        { requesterId: other, receiverId: me },
      ],
    },
  });
  if (links.some((l) => l.status === "ACCEPTED")) return "existing";
  const first = links[0];
  if (first) {
    await prisma.friendship.update({ where: { id: first.id }, data: { status: "ACCEPTED" } });
    return "accepted";
  }
  try {
    await prisma.friendship.create({ data: { requesterId: other, receiverId: me, status: "ACCEPTED" } });
    return "created";
  } catch (err: any) {
    // two scans at the same time: the other request created it
    if (err?.code === "P2002") return "existing";
    throw err;
  }
}
