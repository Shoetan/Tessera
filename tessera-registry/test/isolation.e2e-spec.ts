import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './../src/generated/prisma/client.js';
import { generateNationalId } from './../src/persons/national-id/national-id.js';

// Proof that test/setup-each.ts works: the first test leaves a person behind,
// the second test must not see it. Tests in one file run in the order written.
describe('Test isolation (e2e)', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('a test can save a person', async () => {
    await prisma.person.create({
      data: {
        nationalId: generateNationalId(),
        givenName: 'Ada',
        familyName: 'Okafor',
        dateOfBirth: new Date('1990-05-14'),
      },
    });

    expect(await prisma.person.count()).toBe(1);
  });

  it('the next test does not see that person', async () => {
    expect(await prisma.person.count()).toBe(0);
  });
});
