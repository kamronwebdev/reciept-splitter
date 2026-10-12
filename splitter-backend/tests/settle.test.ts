import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";

// Settle up, balances and notifications against a real PostgreSQL (skipped without DATABASE_URL).
const HAS_DB = !!process.env.DATABASE_URL && !!process.env.JWT_SECRET;
const skip = HAS_DB ? false : "DATABASE_URL / JWT_SECRET not set";

let server: Server;
let base = "";
let prismaRef: typeof import("../src/config/prisma.js").prisma;
type U = { id: number; uniqueId: string; token: string };
const U: Record<"a" | "b" | "c", U> = {} as any;
let sessionId = 0;
const suffix = `${Date.now()}`;

before(async () => {
  if (!HAS_DB) return;
  const { prisma } = await import("../src/config/prisma.js");
  const { default: sessionsRoutes } = await import("../src/routes/sessions.js");
  const { default: notificationsRoutes } = await import("../src/routes/notifications.js");
  const { default: balancesRoutes } = await import("../src/routes/balances.js");
  const { default: friendsRoutes } = await import("../src/routes/friends.js");
  const { signAuthToken } = await import("../src/utils/authToken.js");
  prismaRef = prisma;
  for (const tag of ["a", "b", "c"] as const) {
    const u = await prisma.user.create({
      data: { email: `st-${tag}-${suffix}@test.local`, password: "x", username: `St ${tag.toUpperCase()}`, uniqueId: `ST${tag}${suffix}`.toUpperCase() },
    });
    U[tag] = { id: u.id, uniqueId: u.uniqueId, token: signAuthToken({ id: u.id, email: u.email, tokenVersion: u.tokenVersion }) };
  }
  sessionId = (await prisma.session.create({ data: { creatorId: U.a.id } })).id;
  const app = express();
  app.use(express.json());
  app.use("/sessions", sessionsRoutes);
  app.use("/notifications", notificationsRoutes);
  app.use("/balances", balancesRoutes);
  app.use("/friends", friendsRoutes);
  await new Promise<void>((r) => {
    server = app.listen(0, () => r());
  });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

after(async () => {
  server?.close();
  if (!HAS_DB) return;
  const ids = Object.values(U).map((u) => u.id);
  await prismaRef.sessionHistoryEntry.deleteMany({ where: { sessionId } });
  await prismaRef.session.deleteMany({ where: { id: sessionId } });
  await prismaRef.friendship.deleteMany({ where: { OR: [{ requesterId: { in: ids } }, { receiverId: { in: ids } }] } });
  await prismaRef.user.deleteMany({ where: { id: { in: ids } } });
  await prismaRef.$disconnect();
});

const call = async (method: string, path: string, who: U, body?: unknown) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${who.token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, body: (await res.json()) as any };
};

test("finalize notifies the other participants with their amount", { skip }, async () => {
  const fin = await call("POST", "/sessions/finalize", U.a, {
    sessionId,
    sessionName: "Lunch",
    currency: "UZS",
    participants: [U.a, U.b, U.c].map((u) => ({ uniqueId: u.uniqueId, username: u.uniqueId })),
    items: [
      { id: "i1", name: "Osh", kind: "item", quantity: 3, unitPrice: 30000, totalPrice: 90000, splitMode: "count", assignedTo: [], perPersonCount: { [U.a.uniqueId]: 1, [U.b.uniqueId]: 1, [U.c.uniqueId]: 1 } },
      { id: "i2", name: "Choy", kind: "item", quantity: 1, unitPrice: 10000, totalPrice: 10000, splitMode: "equal", assignedTo: [U.b.uniqueId], perPersonCount: {} },
    ],
  });
  assert.equal(fin.status, 200, JSON.stringify(fin.body));
  const nb = await call("GET", "/notifications", U.b);
  const included = nb.body.items.find((n: any) => n.type === "RECEIPT_INCLUDED");
  assert.ok(included);
  assert.equal(included.data.amount, 40000);
  assert.equal(included.data.currency, "UZS");
  assert.equal(included.data.actor.uniqueId, U.a.uniqueId);
  assert.equal(included.read, false);
  assert.equal((await call("GET", "/notifications", U.a)).body.items.filter((n: any) => n.type === "RECEIPT_INCLUDED").length, 0);

  // finalizing the same receipt again does not notify twice
  await call("POST", "/sessions/finalize", U.a, {
    sessionId,
    sessionName: "Lunch",
    currency: "UZS",
    participants: [U.a, U.b, U.c].map((u) => ({ uniqueId: u.uniqueId, username: u.uniqueId })),
    items: [{ id: "i1", name: "Osh", kind: "item", quantity: 3, unitPrice: 30000, totalPrice: 90000, splitMode: "count", assignedTo: [], perPersonCount: { [U.a.uniqueId]: 1, [U.b.uniqueId]: 1, [U.c.uniqueId]: 1 } }, { id: "i2", name: "Choy", kind: "item", quantity: 1, unitPrice: 10000, totalPrice: 10000, splitMode: "equal", assignedTo: [U.b.uniqueId], perPersonCount: {} }],
  });
  assert.equal((await call("GET", "/notifications", U.b)).body.items.filter((n: any) => n.type === "RECEIPT_INCLUDED").length, 1);
});

test("balances: creator is owed every other share; participants owe the creator", { skip }, async () => {
  const a = (await call("GET", "/balances", U.a)).body;
  assert.deepEqual(a.owedToMe, [{ currency: "UZS", amount: 70000 }]);
  assert.deepEqual(a.iOwe, []);
  assert.equal(a.people.length, 2);
  const b = (await call("GET", "/balances", U.b)).body;
  assert.deepEqual(b.iOwe, [{ currency: "UZS", amount: 40000 }]);
  assert.equal(b.people[0].uniqueId, U.a.uniqueId);
  assert.equal(b.people[0].receipts[0].sessionName, "Lunch");
});

test("payments: participant marks own share, cannot mark others; creator marks anyone; settled", { skip }, async () => {
  const own = await call("POST", `/sessions/${sessionId}/payments`, U.b, { uniqueId: U.b.uniqueId, paid: true });
  assert.equal(own.status, 200);
  assert.ok(own.body.payments[U.b.uniqueId]);
  assert.equal(own.body.settled, false);
  const paidNote = (await call("GET", "/notifications", U.a)).body.items.find((n: any) => n.type === "RECEIPT_PAID");
  assert.equal(paidNote.data.participantUniqueId, U.b.uniqueId);
  assert.equal(paidNote.data.paid, true);

  const other = await call("POST", `/sessions/${sessionId}/payments`, U.b, { uniqueId: U.c.uniqueId, paid: true });
  assert.equal(other.status, 403);
  assert.equal(other.body.code, "FORBIDDEN");
  assert.equal((await call("POST", `/sessions/${sessionId}/payments`, U.a, { uniqueId: U.a.uniqueId, paid: true })).status, 400);

  const byCreator = await call("POST", `/sessions/${sessionId}/payments`, U.a, { uniqueId: U.c.uniqueId, paid: true });
  assert.equal(byCreator.body.settled, true);
  assert.ok((await call("GET", "/notifications", U.c)).body.items.some((n: any) => n.type === "RECEIPT_PAID"));
  assert.deepEqual((await call("GET", "/balances", U.a)).body.owedToMe, []);

  const hist = (await call("GET", "/sessions/history", U.b)).body.entries.find((e: any) => e.sessionId === sessionId);
  assert.equal(hist.settled, true);
  assert.equal(hist.creatorUniqueId, U.a.uniqueId);

  // undo
  const undo = await call("POST", `/sessions/${sessionId}/payments`, U.a, { uniqueId: U.c.uniqueId, paid: false });
  assert.equal(undo.body.settled, false);
  assert.deepEqual((await call("GET", "/balances", U.a)).body.owedToMe, [{ currency: "UZS", amount: 30000 }]);
});

test("notifications: unread count, mark read (ids / all), delete, other users' rows untouched", { skip }, async () => {
  const before = (await call("GET", "/notifications/unread-count", U.a)).body.count;
  assert.ok(before >= 1);
  const list = (await call("GET", "/notifications?limit=1", U.a)).body;
  assert.equal(list.items.length, 1);
  const one = list.items[0].id;
  assert.equal((await call("POST", "/notifications/read", U.a, { ids: [one] })).body.unreadCount, before - 1);
  // B cannot read or delete A's notification
  assert.equal((await call("POST", "/notifications/read", U.b, { ids: [one] })).body.updated, 0);
  assert.equal((await call("DELETE", `/notifications/${one}`, U.b)).status, 404);
  assert.equal((await call("POST", "/notifications/read", U.a, { all: true })).body.unreadCount, 0);
  assert.equal((await call("DELETE", `/notifications/${one}`, U.a)).status, 200);
  assert.equal((await call("POST", "/notifications/read", U.a, {})).status, 400);
});

test("friend request + accept create notifications", { skip }, async () => {
  await call("POST", "/friends/request", U.b, { uniqueId: U.c.uniqueId });
  const req = (await call("GET", "/notifications", U.c)).body.items.find((n: any) => n.type === "FRIEND_REQUEST");
  assert.equal(req.data.actor.uniqueId, U.b.uniqueId);
  await call("PATCH", "/friends/accept", U.c, { uniqueId: U.b.uniqueId });
  assert.ok((await call("GET", "/notifications", U.b)).body.items.some((n: any) => n.type === "FRIEND_ACCEPTED"));
});
