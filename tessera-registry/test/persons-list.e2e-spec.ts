import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';

// The page contract this pins down (same shape as ticket 08's GET /persons/:id/audit):
//   GET /persons?limit=<1..100, default 20>&cursor=<id of the last person you saw>
//   -> { items: Person[], nextCursor: string | null }
// nextCursor is null on the last page.
describe('PersonsController (e2e), GET /persons', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function register(givenName: string) {
    const res = await request(app.getHttpServer())
      .post('/persons')
      .send({
        givenName,
        familyName: 'Okafor',
        dateOfBirth: '1990-05-14',
        gender: 'female',
      })
      .expect(201);
    return res.body;
  }

  // walks every page from the start, collecting every item's id in the order returned
  async function walkAll(query: Record<string, unknown> = {}): Promise<string[]> {
    const seen: string[] = [];
    let cursor: string | null = null;
    let guard = 0;

    do {
      const res: request.Response = await request(app.getHttpServer())
        .get('/persons')
        .query(cursor ? { ...query, cursor } : query)
        .expect(200);

      seen.push(...res.body.items.map((p: { id: string }) => p.id));
      cursor = res.body.nextCursor;
      guard += 1;
    } while (cursor !== null && guard < 50); // guards against an endless loop if paging is broken

    return seen;
  }

  it('returns a page of people plus a cursor for fetching the next page', async () => {
    const person = await register('Ada');

    const res = await request(app.getHttpServer()).get('/persons').expect(200);

    expect(res.body.items.some((p: { id: string }) => p.id === person.id)).toBe(true);
    expect(res.body).toHaveProperty('nextCursor');
  });

  it('nextCursor is null once every person has been returned', async () => {
    await register('Ada');

    const res = await request(app.getHttpServer()).get('/persons').expect(200);

    expect(res.body.nextCursor).toBeNull();
  });

  it('following the cursors returns every person exactly once, no repeats, no gaps', async () => {
    const people = await Promise.all(
      ['Ada', 'Chidi', 'Ngozi', 'Tunde', 'Amara'].map((name) => register(name)),
    );

    const seen = await walkAll({ limit: 2 });

    expect(seen).toHaveLength(people.length);
    expect(new Set(seen).size).toBe(people.length); // no repeats
    for (const person of people) {
      expect(seen).toContain(person.id); // no gaps
    }
  });

  it('a page never has more items than the requested limit', async () => {
    await Promise.all(['Ada', 'Chidi', 'Ngozi'].map((name) => register(name)));

    const res = await request(app.getHttpServer()).get('/persons').query({ limit: 2 }).expect(200);

    expect(res.body.items.length).toBeLessThanOrEqual(2);
  });

  it('registering someone part-way through the walk does not shift or duplicate results already paged through', async () => {
    const before = await Promise.all(['Ada', 'Chidi', 'Ngozi'].map((name) => register(name)));

    const firstPage = await request(app.getHttpServer())
      .get('/persons')
      .query({ limit: 1 })
      .expect(200);
    expect(firstPage.body.items).toHaveLength(1);

    // a new row lands in the middle of the walk, same as a concurrent registration would
    await register('Amara');

    const rest: string[] = [];
    let cursor: string | null = firstPage.body.nextCursor;
    let guard = 0;
    while (cursor !== null && guard < 50) {
      const res = await request(app.getHttpServer())
        .get('/persons')
        .query({ limit: 1, cursor })
        .expect(200);
      rest.push(...res.body.items.map((p: { id: string }) => p.id));
      cursor = res.body.nextCursor;
      guard += 1;
    }

    const seen = [...firstPage.body.items.map((p: { id: string }) => p.id), ...rest];
    const seenBefore = seen.filter((id) => before.some((p) => p.id === id));

    // everyone who existed before the walk started appears exactly once
    expect(new Set(seenBefore).size).toBe(before.length);
    expect(seenBefore).toHaveLength(before.length);
  });

  it('a request for an absurdly large page size is capped, not obeyed', async () => {
    await request(app.getHttpServer()).get('/persons').query({ limit: 100000 }).expect(400);
  });

  it('a malformed cursor returns 400 in the standard error shape', async () => {
    await register('Ada');

    const res = await request(app.getHttpServer())
      .get('/persons')
      .query({ cursor: 'not-a-real-cursor' })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.path).toBe('/persons?cursor=not-a-real-cursor');
  });

  it('rejects a limit outside 1 to 100 with 400', async () => {
    for (const limit of [0, 101, 'abc']) {
      await request(app.getHttpServer()).get('/persons').query({ limit }).expect(400);
    }
  });
});
