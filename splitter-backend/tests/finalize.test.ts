import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";

// Integration test against a real PostgreSQL (DATABASE_URL). Skipped when no database is configured.
const HAS_DB = !!process.env.DATABASE_URL && !!process.env.JWT_SECRET;
const skip = HAS_DB ? false : "DATABASE_URL / JWT_SECRET not set";

let server: Server;
let base = "";
let prismaRef: typeof import("../src/config/prisma.js").prisma;
let token = "";
let otherToken = "";
let sessionId = 0;
const suffix = `${Date.now()}`;
const created: { users: number[]; sessions: number[] } = { users: [], sessions: [] };

const items = [
  { id: "i1", name: "Osh", kind: "item", quantity: 2, unitPrice: 25000, totalPrice: 50000, splitMode: "count", assignedTo: ["A", "B"], perPersonCount: { A: 1, B: 1 } },
  { id: "i2", name: "Lagman", kind: "item", quantity: 1, unitPrice: 38000, totalPrice: 38000, splitMode: "equal", assignedTo: ["A", "B"], perPersonCount: {} },
  { id: "i3", name: "Cola", kind: "item", quantity: 3, unitPrice: 5000, totalPrice: 15000, splitMode: "count", assignedTo: [], perPersonCount: { A: 2, B: 1 } },
  { id: "i4", name: "Service 10%", kind: "fee", quantity: 1, unitPrice: 10300, totalPrice: 10300, splitMode: "equal", assignedTo: [], perPersonCount: {} },
];

before(async () => {
  if (!HAS_DB) return;
  const { prisma } = await import("../src/config/prisma.js");
  const { default: sessionsRoutes } = await import("../src/routes/sessions.js");
  const { signAuthToken } = await import("../src/utils/authToken.js");
  prismaRef = prisma;
  const mk = async (tag: string) =>
    prisma.user.create({ data: { email: `fin-${tag}-${suffix}@test.local`, password: "x", username: `fin${tag}`, uniqueId: `FIN${tag}${suffix}`.toUpperCase() } });
  const a = await mk("a");
  const b = await mk("b");
  created.users.push(a.id, b.id);
  token = signAuthToken({ id: a.id, email: a.email, tokenVersion: a.tokenVersion });
  otherToken = signAuthToken({ id: b.id, email: b.email, tokenVersion: b.tokenVersion });
  const s = await prisma.session.create({ data: { creatorId: a.id } });
  sessionId = s.id;
  created.sessions.push(s.id);
  // participants use the real unique ids
  const ids = { A: a.uniqueId, B: b.uniqueId };
  for (const it of items) {
    it.assignedTo = it.assignedTo.map((x) => (ids as any)[x]);
    it.perPersonCount = Object.fromEntries(Object.entries(it.perPersonCount).map(([k, v]) => [(ids as any)[k], v])) as any;
  }
  (globalThis as any).__ids = ids;
  const app = express();
  app.use(express.json());
  app.use("/sessions", sessionsRoutes);
  await new Promise<void>((r) => {
    server = app.listen(0, () => r());
  });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

after(async () => {
  server?.close();
  if (!HAS_DB) return;
  await prismaRef.sessionHistoryEntry.deleteMany({ where: { sessionId: { in: created.sessions } } });
  await prismaRef.session.deleteMany({ where: { id: { in: created.sessions } } });
  await prismaRef.user.deleteMany({ where: { id: { in: created.users } } });
  await prismaRef.$disconnect();
});

const post = (body: unknown, tk = token) =>
  fetch(`${base}/sessions/finalize`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tk}` }, body: JSON.stringify(body) });

const payload = () => {
  const ids = (globalThis as any).__ids as Record<string, string>;
  return {
    sessionId,
    sessionName: "Dinner",
    currency: "UZS",
    feeMode: "proportional",
    participants: [
      { uniqueId: ids.A, username: "A", avatarUrl: null },
      { uniqueId: ids.B, username: "B", avatarUrl: "https://x/y.jpg" },
    ],
    items: JSON.parse(JSON.stringify(items)),
  };
};

test("finalize: 2 people, equal + by-count items + service fee, UZS", { skip }, async () => {
  const res = await post(payload());
  const body: any = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  const ids = (globalThis as any).__ids as Record<string, string>;
  assert.equal(body.totals.grandTotal, 113300);
  const by = Object.fromEntries(body.totals.byParticipant.map((p: any) => [p.uniqueId, p]));
  // items: A = 25000 + 19000 + 10000 = 54000, B = 25000 + 19000 + 5000 = 49000; fee 10300 split 54:49
  assert.equal(by[ids.A].itemsAmount, 54000);
  assert.equal(by[ids.B].itemsAmount, 49000);
  assert.equal(by[ids.A].amountOwed + by[ids.B].amountOwed, 113300);
  assert.equal(by[ids.A].feesAmount + by[ids.B].feesAmount, 10300);
  // the bill is stored in the history
  const entry = await prismaRef.sessionHistoryEntry.findUnique({ where: { sessionId } });
  assert.equal(entry?.currency, "UZS");
  assert.equal((await prismaRef.session.findUnique({ where: { id: sessionId } }))?.status, "CLOSED");
});

test("finalize: unassigned item -> 400 ITEM_NOT_ASSIGNED with itemIds", { skip }, async () => {
  const p = payload();
  p.items[1]!.assignedTo = [];
  const res = await post(p);
  const body: any = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.code, "ITEM_NOT_ASSIGNED");
  assert.deepEqual(body.itemIds, ["i2"]);
});

test("finalize: unknown session -> 404 SESSION_NOT_FOUND, foreign session -> 403 SESSION_FORBIDDEN", { skip }, async () => {
  const miss: any = await (await post({ ...payload(), sessionId: 2147483000 })).json();
  assert.equal(miss.code, "SESSION_NOT_FOUND");
  const res = await post(payload(), otherToken);
  const body: any = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "SESSION_FORBIDDEN");
});

test("GET /sessions/:id: own session ok, unknown 404, foreign 403", { skip }, async () => {
  const get = (id: number | string, tk = token) => fetch(`${base}/sessions/${id}`, { headers: { authorization: `Bearer ${tk}` } });
  assert.equal((await get(sessionId)).status, 200);
  assert.equal((await get(2147483000)).status, 404);
  assert.equal((await get("abc")).status, 404);
  assert.equal((await get(sessionId, otherToken)).status, 403);
});
