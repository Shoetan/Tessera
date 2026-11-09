import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';

// The page contract these tests pin down (same shape ticket 09 will use for GET /persons):
//   GET /persons/:id/audit?limit=<1..100, default 20>&cursor=<id of the last entry you saw>
//   -> { items: AuditEntry[], nextCursor: string | null }
// nextCursor is null on the last page.
describe('PersonsController (e2e), GET /persons/:id/audit', () => {
  let app: INestApplication;

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
  });

  afterEach(async () => {
    await app.close();
  });

  async function register() {
    const res = await request(app.getHttpServer())
      .post('/persons')
      .send(validPerson)
      .expect(201);
    return res.body;
  }

  // each call is a real change, so each one writes one UPDATED row
  async function rename(personId: string, givenName: string) {
    await request(app.getHttpServer())
      .patch(`/persons/${personId}`)
      .send({ givenName, reason: 'Corrected spelling from birth certificate' })
      .expect(200);
  }

  it('a person who has only been registered has exactly one CREATED entry', async () => {
    const person = await register();

    const res = await request(app.getHttpServer())
      .get(`/persons/${person.id}/audit`)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].action).toBe('created');
    expect(res.body.nextCursor).toBeNull();
  });

  it('each entry shows what happened, what changed, who did it, why, and when', async () => {
    const person = await register();
    await request(app.getHttpServer())
      .post(`/persons/${person.id}/deactivate`)
      .send({ reason: 'Reported deceased, death certificate on file' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/persons/${person.id}/audit`)
      .expect(200);

    const deactivated = res.body.items[1];
    expect(deactivated.action).toBe('deactivated');
    expect(deactivated.changes).toEqual({ status: { from: 'active', to: 'inactive' } });
    expect(deactivated.actor).toBe('system');
    expect(deactivated.reason).toBe('Reported deceased, death certificate on file');
    // a real timestamp, not just "something"
    expect(Number.isNaN(Date.parse(deactivated.createdAt))).toBe(false);
  });

  it('returns every entry, oldest first', async () => {
    const person = await register();
    await rename(person.id, 'Adaeze');
    await request(app.getHttpServer())
      .post(`/persons/${person.id}/deactivate`)
      .send({ reason: 'Reported deceased, death certificate on file' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/persons/${person.id}/audit`)
      .expect(200);

    expect(res.body.items.map((e: { action: string }) => e.action)).toEqual([
      'created',
      'updated',
      'deactivated',
    ]);
  });

  it("only returns this person's entries, never someone else's", async () => {
    const person = await register();
    const someoneElse = await register();
    await rename(someoneElse.id, 'Chioma');

    const res = await request(app.getHttpServer())
      .get(`/persons/${person.id}/audit`)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
  });

  it('pages through a long history: every entry exactly once, in order, then nextCursor is null', async () => {
    const person = await register();
    // 1 CREATED + 4 UPDATED = 5 entries, so limit=2 gives pages of 2, 2, 1
    for (const name of ['Adaeze', 'Adanna', 'Adaora', 'Adaobi']) {
      await rename(person.id, name);
    }

    const full = await request(app.getHttpServer())
      .get(`/persons/${person.id}/audit`)
      .expect(200);
    expect(full.body.items).toHaveLength(5);

    const seen: string[] = [];
    const pageSizes: number[] = [];
    let cursor: string | null = null;
    do {
      const res: request.Response = await request(app.getHttpServer())
        .get(`/persons/${person.id}/audit`)
        .query(cursor ? { limit: 2, cursor } : { limit: 2 })
        .expect(200);

      pageSizes.push(res.body.items.length);
      seen.push(...res.body.items.map((e: { id: string }) => e.id));
      cursor = res.body.nextCursor;
    } while (cursor !== null && pageSizes.length < 10); // the guard stops an endless loop if paging is broken

    expect(pageSizes).toEqual([2, 2, 1]);
    expect(seen).toEqual(full.body.items.map((e: { id: string }) => e.id));
  });

  it('rejects a limit outside 1 to 100 with 400', async () => {
    const person = await register();

    for (const limit of [0, 101, 'abc']) {
      await request(app.getHttpServer())
        .get(`/persons/${person.id}/audit`)
        .query({ limit })
        .expect(400);
    }
  });

  it('returns 404 when the person id does not exist', async () => {
    const unknownId = '00000000-0000-0000-0000-000000000000';

    const res = await request(app.getHttpServer())
      .get(`/persons/${unknownId}/audit`)
      .expect(404);

    expect(res.body.message).toBe(`Person with id "${unknownId}" was not found`);
  });
});
