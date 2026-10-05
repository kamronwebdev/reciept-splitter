import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();

async function main() {
  const e2ePath = '/tmp/e2e_register.json';
  const raw = fs.readFileSync(e2ePath, 'utf8');
  const e2e = JSON.parse(raw);
  const me = await prisma.user.findUnique({ where: { uniqueId: e2e.user.uniqueId } });
  if (!me) {
    console.error('Test user not found');
    process.exit(2);
  }

  const frs = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: me.id }, { receiverId: me.id }] },
    orderBy: { id: 'asc' },
  });
  console.log('Friendship rows involving test user:');
  frs.forEach((f) => console.log(JSON.stringify(f)));

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
