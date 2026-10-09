import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { resolveAvatarUrl } from "../utils/avatar.js";
import { currencyDecimals, fromMinor, toMinor } from "../utils/split.js";

/**
 * Settle up. The person who created (paid for) a finalized receipt is owed every other participant's
 * share until that share is marked as paid. All sums are done in integer minor units per currency.
 */

export type Money = { currency: string; amount: number };
type Share = { uniqueId: string; username: string; minor: number };

export type ReceiptShares = {
  sessionId: number;
  sessionName: string | null;
  finalizedAt: Date;
  currency: string;
  creator: { id: number; uniqueId: string; username: string };
  shares: Share[]; // everyone but the creator
  paid: Map<string, Date>; // uniqueId -> paidAt
};

/** Shares owed to the creator, read from the stored finalize payload. */
export function sharesFromPayload(payload: any, currency: string, creatorUniqueId: string): Share[] {
  const dec = currencyDecimals(currency);
  const list: any[] = Array.isArray(payload?.totals?.byParticipant) ? payload.totals.byParticipant : [];
  return list
    .filter((p) => p?.uniqueId && p.uniqueId !== creatorUniqueId)
    .map((p) => ({ uniqueId: String(p.uniqueId), username: String(p.username || p.uniqueId), minor: toMinor(Number(p.amountOwed ?? p.total ?? 0), dec) }))
    .filter((p) => Number.isFinite(p.minor) && p.minor > 0);
}

/** Every finalized receipt the user created or took part in, with shares and payment state. */
export async function receiptsFor(userId: number, uniqueId: string): Promise<ReceiptShares[]> {
  const entries = await prisma.sessionHistoryEntry.findMany({
    where: { OR: [{ creatorId: userId }, { participantUniqueIds: { has: uniqueId } }] },
    orderBy: { finalizedAt: "desc" },
    include: { creator: { select: { id: true, uniqueId: true, username: true } } },
  });
  if (!entries.length) return [];
  const payments = await prisma.sessionPayment.findMany({
    where: { sessionId: { in: entries.map((e) => e.sessionId) }, paidAt: { not: null } },
  });
  const paidBySession = new Map<number, Map<string, Date>>();
  for (const p of payments) {
    if (!paidBySession.has(p.sessionId)) paidBySession.set(p.sessionId, new Map());
    paidBySession.get(p.sessionId)!.set(p.participantUniqueId, p.paidAt!);
  }
  return entries.map((e) => ({
    sessionId: e.sessionId,
    sessionName: e.sessionName,
    finalizedAt: e.finalizedAt,
    currency: e.currency,
    creator: e.creator,
    shares: sharesFromPayload(e.payload, e.currency, e.creator.uniqueId),
    paid: paidBySession.get(e.sessionId) ?? new Map(),
  }));
}

/** Payment state of one receipt: who still owes, and whether everyone has paid. */
export function paymentState(r: Pick<ReceiptShares, "shares" | "paid">) {
  const payments: Record<string, string | null> = {};
  for (const s of r.shares) payments[s.uniqueId] = r.paid.get(s.uniqueId)?.toISOString() ?? null;
  return { payments, settled: r.shares.every((s) => r.paid.has(s.uniqueId)) };
}

function addMoney(map: Map<string, number>, currency: string, minor: number) {
  map.set(currency, (map.get(currency) ?? 0) + minor);
}
function toList(map: Map<string, number>): Money[] {
  return Array.from(map.entries())
    .filter(([, minor]) => minor !== 0)
    .map(([currency, minor]) => ({ currency, amount: fromMinor(minor, currencyDecimals(currency)) }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

type PersonAcc = {
  uniqueId: string;
  username: string;
  owedToMe: Map<string, number>;
  iOwe: Map<string, number>;
  receipts: { sessionId: number; sessionName: string | null; finalizedAt: string; currency: string; amount: number; direction: "owedToMe" | "iOwe" }[];
};

/** GET /balances payload for one user. */
export async function balancesFor(user: { id: number; uniqueId: string }, req: Pick<Request, "protocol" | "get">) {
  const receipts = await receiptsFor(user.id, user.uniqueId);
  const owedToMe = new Map<string, number>();
  const iOwe = new Map<string, number>();
  const people = new Map<string, PersonAcc>();
  const person = (uniqueId: string, username: string) => {
    if (!people.has(uniqueId)) people.set(uniqueId, { uniqueId, username, owedToMe: new Map(), iOwe: new Map(), receipts: [] });
    return people.get(uniqueId)!;
  };

  for (const r of receipts) {
    const dec = currencyDecimals(r.currency);
    const iAmCreator = r.creator.id === user.id;
    for (const s of r.shares) {
      if (r.paid.has(s.uniqueId)) continue;
      const line = { sessionId: r.sessionId, sessionName: r.sessionName, finalizedAt: r.finalizedAt.toISOString(), currency: r.currency, amount: fromMinor(s.minor, dec) };
      if (iAmCreator) {
        addMoney(owedToMe, r.currency, s.minor);
        const p = person(s.uniqueId, s.username);
        addMoney(p.owedToMe, r.currency, s.minor);
        p.receipts.push({ ...line, direction: "owedToMe" });
      } else if (s.uniqueId === user.uniqueId) {
        addMoney(iOwe, r.currency, s.minor);
        const p = person(r.creator.uniqueId, r.creator.username);
        addMoney(p.iOwe, r.currency, s.minor);
        p.receipts.push({ ...line, direction: "iOwe" });
      }
    }
  }

  const uids = Array.from(people.keys());
  const users = uids.length
    ? await prisma.user.findMany({ where: { uniqueId: { in: uids } }, select: { uniqueId: true, username: true, avatarUrl: true } })
    : [];
  const byUid = new Map(users.map((u) => [u.uniqueId, u]));

  return {
    owedToMe: toList(owedToMe),
    iOwe: toList(iOwe),
    people: Array.from(people.values())
      .map((p) => ({
        uniqueId: p.uniqueId,
        username: byUid.get(p.uniqueId)?.username ?? p.username,
        avatarUrl: resolveAvatarUrl(byUid.get(p.uniqueId)?.avatarUrl, req),
        owedToMe: toList(p.owedToMe),
        iOwe: toList(p.iOwe),
        receipts: p.receipts,
      }))
      .sort((a, b) => a.username.localeCompare(b.username)),
  };
}
