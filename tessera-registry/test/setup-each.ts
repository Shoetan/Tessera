import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './../src/generated/prisma/client.js';

// Loaded at the start of every e2e test file. The beforeEach below therefore runs
// before every e2e test, so each one starts with empty tables.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

beforeEach(async () => {
  // every table we own; _prisma_migrations is Prisma's record of what was applied, so it stays
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) {
    return;
  }

  const names = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  // CASCADE also empties tables that point at these ones (audit entries point at persons)
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
