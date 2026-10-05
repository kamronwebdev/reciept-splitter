import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();

async function main() {
  const email = 'kamron@gmail.com';
  const targets = ['#6396', '#8821', '#8410', '#5615'];

  const kamron = await prisma.user.findUnique({ where: { email } });
  if (!kamron) {
    console.error('User with email', email, 'not found. Aborting.');
    process.exit(2);
  }

  console.log('Kamron identified:', { id: kamron.id, uniqueId: kamron.uniqueId });

  const createdOrUpdated = [];

  for (const uq of targets) {
    const target = await prisma.user.findUnique({ where: { uniqueId: uq } });
    if (!target) {
      console.warn('Target user not found for', uq, '— skipping');
      continue;
    }

    // Check existing friendship in either direction
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: kamron.id, receiverId: target.id },
          { requesterId: target.id, receiverId: kamron.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        console.log('Existing ACCEPTED friendship found with', uq, 'id:', existing.id);
        createdOrUpdated.push({ uniqueId: uq, action: 'exists', id: existing.id });
        continue;
      }
      const updated = await prisma.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED' } });
      console.log('Updated friendship to ACCEPTED:', updated.id, 'with', uq);
      createdOrUpdated.push({ uniqueId: uq, action: 'updated', id: updated.id });
      continue;
    }

    const created = await prisma.friendship.create({ data: { requesterId: kamron.id, receiverId: target.id, status: 'ACCEPTED' } });
    console.log('Created ACCEPTED friendship id:', created.id, 'with', uq);
    createdOrUpdated.push({ uniqueId: uq, action: 'created', id: created.id });
  }

  // Generate JWT like backend does
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET missing in .env — cannot authenticate to API for verification');
    process.exit(3);
  }
  const token = jwt.sign({ id: kamron.id, email: kamron.email }, secret, { expiresIn: '7d' });

  // Call GET /friends
  const base = `http://localhost:${process.env.PORT || 3001}`;
  const resp = await fetch(`${base}/friends`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await resp.json();

  console.log('\nVerification GET /friends response (as kamron):');
  console.log(JSON.stringify(body, null, 2));

  console.log('\nSummary of actions:');
  console.log(JSON.stringify({ kamron: { id: kamron.id, uniqueId: kamron.uniqueId }, createdOrUpdated }, null, 2));

  process.exit(0);
}

main().catch((e) => {
  console.error('Script error:', e);
  process.exit(1);
});
