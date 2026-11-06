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

  it('if the audit write fails during a PATCH, the person is left unchanged', async () => {
    // created straight through Prisma: POST /persons would fail here, because every audit write fails
    const person = await prisma.person.create({
      data: {
        nationalId: '234567890124',
        givenName: 'Ada',
        familyName: 'Okafor',
        dateOfBirth: new Date('1990-05-14'),
      },
    });

    await request(app.getHttpServer())
      .patch(`/persons/${person.id}`)
      .send({ familyName: 'Okafor-Bello', reason: 'Corrected spelling from birth certificate' })
      .expect(500);

    // the update and its audit row are saved together or not at all
    const saved = await prisma.person.findUnique({ where: { id: person.id } });
    expect(saved?.familyName).toBe('Okafor');
  });
});
