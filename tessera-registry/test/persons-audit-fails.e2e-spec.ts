import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import {AuditService} from './../src/audit/audit.service.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';

describe('PersonsController (e2e), audit write fails', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // the real database stays; only the audit write is swapped for one that always fails
      .overrideProvider(AuditService)
      .useValue({
        record: () => Promise.reject(new Error('audit store unavailable')),
      })
      .compile();

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

  it('if the audit write fails, no person row is saved', async () => {
    await request(app.getHttpServer())
      .post('/persons')
      .send({ givenName: 'Ada', familyName: 'Okafor', dateOfBirth: '1990-05-14' })
      .expect(500);

    // a person must never exist without a record of how they got here
    expect(await prisma.person.count()).toBe(0);
  });
});
