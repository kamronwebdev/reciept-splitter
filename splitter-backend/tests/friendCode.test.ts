import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { generateInviteCode, normalizeInviteCode, INVITE_CODE_LENGTH } from "../src/services/friendCode.js";

// Pure helpers run everywhere; the endpoint tests need PostgreSQL (DATABASE_URL) and are skipped without it.
const HAS_DB = !!process.env.DATABASE_URL && !!process.env.JWT_SECRET;
const skip = HAS_DB ? false : "DATABASE_URL / JWT_SECRET not set";

test("invite codes: random, fixed length, unambiguous alphabet", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const c = generateInviteCode();
    assert.equal(c.length, INVITE_CODE_LENGTH);
    assert.match(c, /^[23456789abcdefghjkmnpqrstuvwxyz]+$/);
    seen.add(c);
  }
  assert.equal(seen.size, 500);
  assert.equal(normalizeInviteCode("  ABCDEFGH2345 "), "abcdefgh2345");
  assert.equal(normalizeInviteCode("abc"), null);
  assert.equal(normalizeInviteCode("abcdefgh234l"), null); // 'l' is not in the alphabet
  assert.equal(normalizeInviteCode(42), null);
});

let server: Server;
let base = "";
let prismaRef: typeof import("../src/config/prisma.js").prisma;
const users: { id: number; uniqueId: string; token: string }[] = [];
const suffix = `${Date.now()}`;

before(async () => {
  if (!HAS_DB) return;
  const { prisma } = await import("../src/config/prisma.js");
  const { default: friendsRoutes } = await import("../src/routes/friends.js");
  const { default: landingRoutes } = await import("../src/routes/landing.js");
  const { signAuthToken } = await import("../src/utils/authToken.js");
  prismaRef = prisma;
  for (const tag of ["a", "b", "c", "d"]) {
    const u = await prisma.user.create({
      data: { email: `fc-${tag}-${suffix}@test.local`, password: "x", username: `Fc ${tag.toUpperCase()}`, uniqueId: `FC${tag}${suffix}`.toUpperCase() },
    });
    users.push({ id: u.id, uniqueId: u.uniqueId, token: signAuthToken({ id: u.id, email: u.email, tokenVersion: u.tokenVersion }) });
  }
  const app = express();
  app.use(express.json());
  app.use(landingRoutes);
  app.use("/friends", friendsRoutes);
  await new Promise<void>((r) => {
    server = app.listen(0, () => r());
  });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

after(async () => {
  server?.close();
  if (!HAS_DB) return;
  const ids = users.map((u) => u.id);
  await prismaRef.friendship.deleteMany({ where: { OR: [{ requesterId: { in: ids } }, { receiverId: { in: ids } }] } });
  await prismaRef.user.deleteMany({ where: { id: { in: ids } } });
  await prismaRef.$disconnect();
});

const call = async (method: string, path: string, who: number, body?: unknown) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${users[who]!.token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, body: (await res.json()) as any };
};

test("my-code is permanent, has https + deep links, and the card shows status none", { skip }, async () => {
  const first = await call("GET", "/friends/my-code", 0);
  assert.equal(first.status, 200);
  const again = await call("GET", "/friends/my-code", 0);
  assert.equal(again.body.code, first.body.code);
  assert.match(first.body.url, new RegExp(`/f/${first.body.code}$`));
  assert.equal(first.body.deepLink, `receipt-splitter://f/${first.body.code}`);

  const card = await call("GET", `/friends/code/${first.body.code.toUpperCase()}`, 1);
  assert.equal(card.status, 200);
  assert.equal(card.body.uniqueId, users[0]!.uniqueId);
  assert.equal(card.body.username, "Fc A");
  assert.equal(card.body.friendshipStatus, "none");
  assert.equal(card.body.email, undefined);
});

test("own code -> status self on lookup, SELF on add", { skip }, async () => {
  const { body } = await call("GET", "/friends/my-code", 0);
  assert.equal((await call("GET", `/friends/code/${body.code}`, 0)).body.friendshipStatus, "self");
  const add = await call("POST", `/friends/code/${body.code}/add`, 0);
  assert.equal(add.status, 400);
  assert.equal(add.body.code, "SELF");
});

test("add creates an accepted friendship; adding again -> ALREADY_FRIENDS", { skip }, async () => {
  const { body } = await call("GET", "/friends/my-code", 0);
  const add = await call("POST", `/friends/code/${body.code}/add`, 1);
  assert.equal(add.status, 200);
  assert.equal(add.body.action, "created");
  assert.equal(add.body.friend.uniqueId, users[0]!.uniqueId);
  assert.equal((await call("GET", `/friends/code/${body.code}`, 1)).body.friendshipStatus, "friends");
  const again = await call("POST", `/friends/code/${body.code}/add`, 1);
  assert.equal(again.status, 409);
  assert.equal(again.body.code, "ALREADY_FRIENDS");
  assert.equal(again.body.friend.uniqueId, users[0]!.uniqueId);
});

test("a pending request (either direction) is reported and then accepted", { skip }, async () => {
  // C asked A earlier (A has an incoming request); A scans C's code
  await prismaRef.friendship.create({ data: { requesterId: users[2]!.id, receiverId: users[0]!.id, status: "PENDING" } });
  const cCode = (await call("GET", "/friends/my-code", 2)).body.code;
  assert.equal((await call("GET", `/friends/code/${cCode}`, 0)).body.friendshipStatus, "pending_incoming");
  assert.equal((await call("GET", `/friends/code/${(await call("GET", "/friends/my-code", 0)).body.code}`, 2)).body.friendshipStatus, "pending_outgoing");
  const add = await call("POST", `/friends/code/${cCode}/add`, 0);
  assert.equal(add.status, 200);
  assert.equal(add.body.action, "accepted");
  const rows = await prismaRef.friendship.findMany({ where: { OR: [{ requesterId: users[2]!.id, receiverId: users[0]!.id }, { requesterId: users[0]!.id, receiverId: users[2]!.id }] } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.status, "ACCEPTED");
});

test("reset makes the old code invalid (API and landing page)", { skip }, async () => {
  const old = (await call("GET", "/friends/my-code", 3)).body.code;
  const reset = await call("POST", "/friends/my-code/reset", 3);
  assert.equal(reset.status, 200);
  assert.notEqual(reset.body.code, old);
  const lookup = await call("GET", `/friends/code/${old}`, 1);
  assert.equal(lookup.status, 404);
  assert.equal(lookup.body.code, "INVALID_CODE");
  assert.equal((await call("POST", `/friends/code/${old}/add`, 1)).body.code, "INVALID_CODE");
  assert.equal((await call("GET", `/friends/code/${reset.body.code}`, 1)).status, 200);
  assert.equal((await call("GET", "/friends/code/not-a-code", 1)).body.code, "INVALID_CODE");

  const html = await fetch(`${base}/f/${old}`);
  assert.equal(html.status, 404);
  assert.match(html.headers.get("content-type") || "", /text\/html/);
});

test("landing page shows the owner and a deep link; escapes HTML", { skip }, async () => {
  await prismaRef.user.update({ where: { id: users[3]!.id }, data: { username: "<b>Evil</b>" } });
  const code = (await call("GET", "/friends/my-code", 3)).body.code;
  const res = await fetch(`${base}/f/${code}`, { headers: { "accept-language": "uz-UZ" } });
  const text = await res.text();
  assert.equal(res.status, 200);
  assert.ok(text.includes(`receipt-splitter://f/${code}`));
  assert.ok(text.includes("&lt;b&gt;Evil&lt;/b&gt;"));
  assert.ok(!text.includes("<b>Evil</b>"));
  assert.ok(text.includes("ochish"));
});

test("old token invites: POST /friends/join returns the inviter card; GET opens a landing page", { skip }, async () => {
  const jwt = (await import("jsonwebtoken")).default;
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign({ typ: "friend_invite", inviterId: users[3]!.id, iat: now, exp: now + 300 }, process.env.JWT_SECRET!);
  const join = await call("POST", "/friends/join", 2, { token });
  assert.equal(join.status, 200);
  assert.equal(join.body.friend.uniqueId, users[3]!.uniqueId);
  assert.equal(join.body.status, "friends");
  const self = await call("POST", "/friends/join", 3, { token });
  assert.equal(self.body.action, "self");
  const bad = await call("POST", "/friends/join", 2, { token: "garbage" });
  assert.equal(bad.body.code, "INVALID_INVITE");
  assert.equal((await fetch(`${base}/friends/join?token=${encodeURIComponent(token)}`)).status, 200);
  assert.equal((await fetch(`${base}/friends/join?token=expired`)).status, 410);
});
