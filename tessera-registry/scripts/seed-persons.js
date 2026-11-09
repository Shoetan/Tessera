// Fills the database up to TARGET_COUNT people. Run via scripts/seed.sh, which
// builds the project first so this can import the real, tested app code from
// dist/ instead of re-implementing national ID generation or audit writing.
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { PersonsService } from '../dist/persons/persons.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';

const TARGET_COUNT = 100;
const SEED_ACTOR = 'seed-script';

const GIVEN_NAMES = [
  'Ada', 'Chidi', 'Ngozi', 'Tunde', 'Amara', 'Emeka', 'Zainab', 'Kwame',
  'Folake', 'Obinna', 'Chioma', 'Bayo', 'Ifeoma', 'Segun', 'Adaeze', 'Uche',
  'Yetunde', 'Nnamdi', 'Halima', 'Femi',
];

const FAMILY_NAMES = [
  'Okafor', 'Adewale', 'Bello', 'Eze', 'Okoro', 'Afolabi', 'Nwosu', 'Balogun',
  'Chukwu', 'Olawale',
];

const GENDERS = ['male', 'female', 'other'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateOfBirth() {
  const year = randomInt(1950, 2008);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28); // 28 keeps every month valid, no leap-year edge cases
  return new Date(Date.UTC(year, month - 1, day));
}

// person #0 is Ada Okafor, #1 is Chidi Adewale, ... wrapping around both name
// lists so 100 people need no 101st name, just a new combination
function syntheticPerson(index) {
  const givenName = GIVEN_NAMES[index % GIVEN_NAMES.length];
  const familyName = FAMILY_NAMES[index % FAMILY_NAMES.length];
  // every 7th person has no gender recorded, since it's optional on real registrations too
  const gender = index % 7 === 0 ? undefined : GENDERS[index % GENDERS.length];

  return {
    givenName,
    familyName,
    dateOfBirth: randomDateOfBirth(),
    gender,
  };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  try {
    const prisma = app.get(PrismaService);
    const personsService = app.get(PersonsService);

    const existingCount = await prisma.person.count();
    const remaining = TARGET_COUNT - existingCount;

    if (remaining <= 0) {
      console.log(`Database already has ${existingCount} people; nothing to seed.`);
      return;
    }

    console.log(`Seeding ${remaining} people (${existingCount} already in the database)...`);

    for (let i = 0; i < remaining; i++) {
      const dto = syntheticPerson(existingCount + i);
      const person = await personsService.registerPerson(dto, SEED_ACTOR);
      console.log(`  ${i + 1}/${remaining}: ${person.givenName} ${person.familyName} (${person.nationalId})`);
    }

    console.log(`Done. Database now has ${existingCount + remaining} people.`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
