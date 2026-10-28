import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';

describe('HealthController (e2e), database unreachable', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // hand the app a fake database whose ping always fails
      .overrideProvider(PrismaService)
      .useValue({
        $queryRaw: () => Promise.reject(new Error('connection refused')),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // main.ts registers this filter, but tests never run main.ts
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  it('/health (GET) reports 503 in the standard error shape, not a 500', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(503)
      .expect((res) => {
        // the whole body can't be compared: timestamp changes every run
        expect(res.body.statusCode).toBe(503);
        expect(res.body.message).toBe('Database is down');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
