import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();

async function main() {
  const email = 'kamron@gmail.com';
  const kamron = await prisma.user.findUnique({ where: { email } });
  if (!kamron) {
    console.error('Kamron user not found; create test user first');
    process.exit(2);
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET missing in .env');
    process.exit(3);
  }

  const token = jwt.sign({ id: kamron.id, email: kamron.email }, secret, { expiresIn: '1h' });
  const base = `http://localhost:${process.env.PORT || 3001}`;

  const payload = {
    sessionId: 1,
    sessionName: 'Test finalize - no currency',
    participants: [
      { uniqueId: kamron.uniqueId, username: kamron.username || kamron.uniqueId },
    ],
    items: [
      { id: 'i1', name: 'Tea', price: 10, quantity: 1, splitMode: 'equal', assignedTo: [kamron.uniqueId] },
    ],
    // intentionally omit currency
  };

  const resp = await fetch(`${base}/sessions/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await resp.json();
  console.log('HTTP', resp.status);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((e) => {
  console.error('Script error:', e);
  process.exit(1);
});
