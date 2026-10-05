import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

// Load environment from project .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const e2ePath = '/tmp/e2e_register.json';
  let e2e = null;
  try {
    const raw = fs.readFileSync(e2ePath, 'utf8');
    e2e = JSON.parse(raw);
  } catch (e) {
    console.log('No /tmp/e2e_register.json found, will attempt to pick a test user from DB');
  }

  // Identify current test user
  let me = null;
  if (e2e?.user?.uniqueId) {
    me = await prisma.user.findUnique({ where: { uniqueId: e2e.user.uniqueId } });
    if (!me) {
      console.log('e2e user from /tmp not found in DB:', e2e.user.uniqueId);
    }
  }

  if (!me) {
    // fallback: pick a user with email containing 'e2e' or 'test'
    const maybe = await prisma.user.findFirst({ where: { OR: [{ email: { contains: 'e2e' } }, { email: { contains: 'test' } }] } });
    if (maybe) {
      me = maybe;
      console.log('Picked fallback test user by email:', me.email, me.uniqueId);
    }
  }

  if (!me) {
    console.error('Could not determine a safe test user in the local DB. Aborting without changes.');
    process.exit(2);
  }

  console.log('Using test user:', { id: me.id, email: me.email, uniqueId: me.uniqueId, username: me.username });

  const names = ['Asadbek', 'Mirjalol', 'Mirfayz', 'Amirbek'];
  const created = [];

  for (const name of names) {
    // Check by username first to avoid creating duplicates
    const existingByName = await prisma.user.findFirst({ where: { username: name } });
    if (existingByName) {
      console.log('User with username exists, skipping creation:', name, existingByName.uniqueId);
      created.push({ name, existed: true, user: existingByName });
      continue;
    }

    // generate uniqueId like #1234
    let uniqueId;
    for (let i = 0; i < 10; i++) {
      uniqueId = '#' + Math.floor(1000 + Math.random() * 9000);
      const exists = await prisma.user.findUnique({ where: { uniqueId } });
      if (!exists) break;
      uniqueId = null;
    }
    if (!uniqueId) {
      throw new Error('Failed to generate a unique uniqueId for ' + name);
    }

    const email = `dev+${name.toLowerCase()}@example.com`;
    const password = 'Test!' + Math.floor(1000 + Math.random() * 9000);
    const hashed = await bcrypt.hash(password, 10);

    const u = await prisma.user.create({
      data: {
        email,
        password: hashed,
        username: name,
        uniqueId,
      },
    });
    console.log('Created user:', { id: u.id, username: u.username, uniqueId: u.uniqueId, email });
    created.push({ name, existed: false, user: u, password });
  }

  // Create ACCEPTED friendships between me and each created/existing user
  for (const entry of created) {
    const target = entry.user;
    if (!target || target.id === me.id) continue;

    // Check existing friendship in either direction
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: me.id, receiverId: target.id },
          { requesterId: target.id, receiverId: me.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        console.log('Friendship already accepted with', target.uniqueId);
        continue;
      }
      // If pending or other, update to ACCEPTED
      const updated = await prisma.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED' } });
      console.log('Updated existing friendship to ACCEPTED:', updated.id);
      continue;
    }

    // Create friendship with me as requester and ACCEPTED status
    const createdFr = await prisma.friendship.create({
      data: { requesterId: me.id, receiverId: target.id, status: 'ACCEPTED' },
    });
    console.log('Created friendship ACCEPTED id:', createdFr.id, 'with', target.uniqueId);
  }

  // Verification: fetch friends as the API would
  const asRequester = await prisma.friendship.findMany({ where: { requesterId: me.id, status: 'ACCEPTED' }, include: { receiver: true } });
  const asReceiver = await prisma.friendship.findMany({ where: { receiverId: me.id, status: 'ACCEPTED' }, include: { requester: true } });

  const friends = [
    ...asRequester.map((f) => f.receiver),
    ...asReceiver.map((f) => f.requester),
  ];

  console.log('Verification: friend uniqueIds for me:', friends.map((f) => f.uniqueId));

  // Print created records
  console.log('Created/Found users:');
  created.forEach((c) => {
    console.log({ name: c.name, existed: c.existed, id: c.user.id, uniqueId: c.user.uniqueId, email: c.user.email, password: c.password });
  });

  process.exit(0);
}

main().catch((e) => {
  console.error('Script error:', e);
  process.exit(1);
});
