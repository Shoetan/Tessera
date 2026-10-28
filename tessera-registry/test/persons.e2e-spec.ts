import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';
import { validateVerhoeffCheckDigit } from './../src/persons/national-id/verhoeff.js';

describe('PersonsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const validPerson = {
    givenName: 'Ada',
    familyName: 'Okafor',
    dateOfBirth: '1990-05-14',
    gender: 'female',
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

    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /persons', () => {
    it('registers a person: 201, a valid national ID, and a real row in the database', async () => {
      const res = await request(app.getHttpServer())
        .post('/persons')
        .send(validPerson)
        .expect(201);

      expect(res.body.nationalId).toMatch(/^[2-9][0-9]{11}$/);
      expect(validateVerhoeffCheckDigit(res.body.nationalId)).toBe(true);

      // not just echoed back: read it from the database ourselves
      const saved = await prisma.person.findUnique({ where: { id: res.body.id } });
      expect(saved?.nationalId).toBe(res.body.nationalId);
    });

    it('registers a person without a gender, because gender is optional', async () => {
      const { gender, ...withoutGender } = validPerson;

      await request(app.getHttpServer()).post('/persons').send(withoutGender).expect(201);
    });

    it('rejects a nationalId sent by the caller', async () => {
      const res = await request(app.getHttpServer())
        .post('/persons')
        .send({ ...validPerson, nationalId: '234567890124' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(await prisma.person.count()).toBe(0);
    });

    it('rejects a missing given name with 400', async () => {
      const { givenName, ...withoutGivenName } = validPerson;

      const res = await request(app.getHttpServer())
        .post('/persons')
        .send(withoutGivenName)
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('rejects an unrecognised gender with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/persons')
        .send({ ...validPerson, gender: 'robot' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('rejects a date of birth in the future with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/persons')
        .send({ ...validPerson, dateOfBirth: '2999-01-01' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });
});
