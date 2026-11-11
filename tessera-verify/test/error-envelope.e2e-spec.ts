import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';

describe('Error envelope (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // createNestApplication() does NOT run main.ts, so the global filter
    // has to be registered here too, or the test app returns Nest's default
    // error shape instead of our envelope.
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the five-field envelope for an unknown route', async () => {
    const res = await request(app.getHttpServer()).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(Object.keys(res.body).sort()).toEqual([
      'error',
      'message',
      'path',
      'statusCode',
      'timestamp',
    ]);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.path).toBe('/does-not-exist');
  });
});
