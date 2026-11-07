import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';

// Rig the dice: the first two IDs drawn are the same ID. The first person gets it;
// the second registration draws it again, as if by chance, after the first person
// has been deactivated. After that, real IDs.
vi.mock('./../src/persons/national-id/national-id.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./../src/persons/national-id/national-id.js')>();
  let calls = 0;
  let repeated: string | undefined;
  return {
    ...actual,
    generateNationalId: vi.fn(() => {
      calls++;
      if (calls <= 2) {
        repeated ??= actual.generateNationalId();
        return repeated;
      }
      return actual.generateNationalId();
    }),
  };
});

describe('PersonsController (e2e), a deactivated national ID is never reissued', () => {
  let app: INestApplication;

  const validPerson = {
    givenName: 'Ada',
    familyName: 'Okafor',
    dateOfBirth: '1990-05-14',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // main.ts registers these, but tests never run main.ts
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("a deactivated person's national ID is never given to a newly registered person", async () => {
    const first = await request(app.getHttpServer())
      .post('/persons')
      .send(validPerson)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/persons/${first.body.id}/deactivate`)
      .send({ reason: 'Reported deceased, death certificate on file' })
      .expect(200);

    // the dice now land on the first person's ID again
    const second = await request(app.getHttpServer())
      .post('/persons')
      .send({ ...validPerson, givenName: 'Bola' })
      .expect(201);

    expect(second.body.nationalId).not.toBe(first.body.nationalId);
  });
});
