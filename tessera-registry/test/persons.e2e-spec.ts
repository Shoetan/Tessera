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

    it('registering a person writes exactly one CREATED audit row, recording who did it', async () => {
      const res = await request(app.getHttpServer())
        .post('/persons')
        .send(validPerson)
        .expect(201);

      // read the audit table ourselves, the response does not include it
      const entries = await prisma.auditEntry.findMany({ where: { personId: res.body.id } });
      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe('created');
      // no login in P0, so the controller passes 'system' (Decisions Log, 2026-10-29)
      expect(entries[0].actor).toBe('system');
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
      expect(res.body.message).toContain('dateOfBirth must not be in the future');
    });
  });

  describe('GET /persons/:id', () => {
    it('returns the person that was registered', async () => {
      const created = await request(app.getHttpServer())
        .post('/persons')
        .send(validPerson)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/persons/${created.body.id}`)
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(res.body.nationalId).toBe(created.body.nationalId);
    });

    it('returns 404 in the standard error shape for an unknown id', async () => {
      const unknownId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .get(`/persons/${unknownId}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe(`Person with id "${unknownId}" was not found`);
      expect(res.body.path).toBe(`/persons/${unknownId}`);
    });
  });

  describe('PATCH /persons/:id', () => {
    // every PATCH needs a reason, so most tests send this alongside the fields they change
    const reason = 'Corrected spelling from birth certificate';

    // register through the API, so the person also has their CREATED row
    async function register() {
      const res = await request(app.getHttpServer())
        .post('/persons')
        .send(validPerson)
        .expect(201);
      return res.body;
    }

    // only the UPDATED rows; registering always leaves one CREATED row behind
    async function updatedRows(personId: string) {
      return prisma.auditEntry.findMany({ where: { personId, action: 'updated' } });
    }

    it('returns 404 when the person id does not exist', async () => {
      const unknownId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .patch(`/persons/${unknownId}`)
        .send({ familyName: 'Okafor-Bello', reason })
        .expect(404);

      expect(res.body.message).toBe(`Person with id "${unknownId}" was not found`);
    });

    it('changes familyName and writes one updated row containing only familyName', async () => {
      const person = await register();

      const res = await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ familyName: 'Okafor-Bello', reason })
        .expect(200);

      expect(res.body.familyName).toBe('Okafor-Bello');

      // the change is really saved, not just echoed back
      const saved = await prisma.person.findUnique({ where: { id: person.id } });
      expect(saved?.familyName).toBe('Okafor-Bello');

      const rows = await updatedRows(person.id);
      expect(rows).toHaveLength(1);
      // toEqual, not toMatchObject: any extra field in changes fails this test
      expect(rows[0].changes).toEqual({
        familyName: { from: 'Okafor', to: 'Okafor-Bello' },
      });
      expect(rows[0].actor).toBe('system');
    });

    it('stores the reason on the updated row', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ familyName: 'Okafor-Bello', reason })
        .expect(200);

      const rows = await updatedRows(person.id);
      expect(rows[0].reason).toBe(reason);
    });

    it('rejects a missing reason with 400, and changes nothing', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ familyName: 'Okafor-Bello' })
        .expect(400);

      const saved = await prisma.person.findUnique({ where: { id: person.id } });
      expect(saved?.familyName).toBe('Okafor');
      expect(await updatedRows(person.id)).toHaveLength(0);
    });

    it('rejects an empty reason with 400', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ familyName: 'Okafor-Bello', reason: '' })
        .expect(400);
    });

    it('rejects a body containing nationalId with 400, and changes nothing', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ nationalId: '234567890124', reason })
        .expect(400);

      const saved = await prisma.person.findUnique({ where: { id: person.id } });
      expect(saved?.nationalId).toBe(person.nationalId);
    });

    it('rejects a body containing id with 400, and changes nothing', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ id: '11111111-1111-1111-1111-111111111111', reason })
        .expect(400);

      expect(await prisma.person.findUnique({ where: { id: person.id } })).not.toBeNull();
    });

    it('several fields changed at once go into one row, not one row per field', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ givenName: 'Adaeze', familyName: 'Okafor-Bello', reason })
        .expect(200);

      const rows = await updatedRows(person.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].changes).toEqual({
        givenName: { from: 'Ada', to: 'Adaeze' },
        familyName: { from: 'Okafor', to: 'Okafor-Bello' },
      });
    });

    it('a field that was sent but did not change is left out of the row', async () => {
      const person = await register();

      // givenName is sent, but it is already 'Ada'; only gender really changes
      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ givenName: 'Ada', gender: 'other', reason })
        .expect(200);

      const rows = await updatedRows(person.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].changes).toEqual({
        gender: { from: 'female', to: 'other' },
      });
    });

    it('sending only values identical to what is stored succeeds, and writes no updated row', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ givenName: 'Ada', familyName: 'Okafor', reason })
        .expect(200);

      // a change that changed nothing must not leave a trail suggesting otherwise
      expect(await updatedRows(person.id)).toHaveLength(0);
    });

    it('changing dateOfBirth is recorded', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ dateOfBirth: '1991-02-03', reason })
        .expect(200);

      const rows = await updatedRows(person.id);
      expect(rows).toHaveLength(1);
      // a Date is stored in the JSON column as an ISO string
      expect(rows[0].changes).toEqual({
        dateOfBirth: { from: '1990-05-14T00:00:00.000Z', to: '1991-02-03T00:00:00.000Z' },
      });
    });

    it('sending the same dateOfBirth that is stored writes no updated row', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ dateOfBirth: validPerson.dateOfBirth, reason })
        .expect(200);

      expect(await updatedRows(person.id)).toHaveLength(0);
    });
  });

  describe('POST /persons/:id/deactivate', () => {
    const reason = 'Reported deceased, death certificate on file';

    async function register() {
      const res = await request(app.getHttpServer())
        .post('/persons')
        .send(validPerson)
        .expect(201);
      return res.body;
    }

    // only the DEACTIVATED rows; registering always leaves one CREATED row behind
    async function deactivatedRows(personId: string) {
      return prisma.auditEntry.findMany({ where: { personId, action: 'deactivated' } });
    }

    it('deactivates a person: status becomes inactive, and one deactivated row is written with the reason', async () => {
      const person = await register();

      const res = await request(app.getHttpServer())
        .post(`/persons/${person.id}/deactivate`)
        .send({ reason })
        .expect(200);

      expect(res.body.status).toBe('inactive');

      // really saved, not just echoed back
      const saved = await prisma.person.findUnique({ where: { id: person.id } });
      expect(saved?.status).toBe('inactive');

      const rows = await deactivatedRows(person.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].reason).toBe(reason);
      expect(rows[0].changes).toEqual({ status: { from: 'active', to: 'inactive' } });
      expect(rows[0].actor).toBe('system');
    });

    it('returns 404 when the person id does not exist', async () => {
      const unknownId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .post(`/persons/${unknownId}/deactivate`)
        .send({ reason })
        .expect(404);

      expect(res.body.message).toBe(`Person with id "${unknownId}" was not found`);
    });

    it('returns 400 when no reason is given, and changes nothing', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .post(`/persons/${person.id}/deactivate`)
        .send({})
        .expect(400);

      const saved = await prisma.person.findUnique({ where: { id: person.id } });
      expect(saved?.status).toBe('active');
      expect(await deactivatedRows(person.id)).toHaveLength(0);
    });

    it('returns 409 when the person is already inactive, and writes no second row', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .post(`/persons/${person.id}/deactivate`)
        .send({ reason })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/persons/${person.id}/deactivate`)
        .send({ reason })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.message).toBe(`Person with id "${person.id}" is already inactive`);
      expect(await deactivatedRows(person.id)).toHaveLength(1);
    });

    it('the person and their national ID can still be read after deactivation', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .post(`/persons/${person.id}/deactivate`)
        .send({ reason })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/persons/${person.id}`)
        .expect(200);

      expect(res.body.nationalId).toBe(person.nationalId);
      expect(res.body.status).toBe('inactive');
    });

    it('there is no DELETE route', async () => {
      const person = await register();

      await request(app.getHttpServer())
        .delete(`/persons/${person.id}`)
        .expect(404);

      expect(await prisma.person.findUnique({ where: { id: person.id } })).not.toBeNull();
    });
  });
});
