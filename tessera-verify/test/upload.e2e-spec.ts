import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ConfigService } from '@nestjs/config';

import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';

// POST /uploads — Multer single-file field "file", saved to UPLOAD_DIR on disk.
// Guards: max 5MB, mimetypes image/jpeg | image/png | application/pdf.
// Success -> 201 { filename, size, mimetype }. No DB row yet.
describe('Upload (e2e)', () => {
  let app: INestApplication;
  let uploadDir: string;

  beforeAll(async () => {
    // Point uploads at a throwaway temp dir so the real ./uploads stays clean
    // and we can assert the file actually lands on disk. The app reads the
    // directory via ConfigService, and with a `validate` function the .env
    // file value wins over process.env, so we override ConfigService directly
    // to hand back our temp dir for UPLOAD_DIR (and delegate everything else).
    uploadDir = await mkdtemp(join(tmpdir(), 'tessera-upload-'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) =>
          key === 'UPLOAD_DIR' ? uploadDir : process.env[key],
        getOrThrow: (key: string) => {
          const value = key === 'UPLOAD_DIR' ? uploadDir : process.env[key];
          if (value === undefined) {
            throw new Error(`Config key "${key}" is not set`);
          }
          return value;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // createNestApplication() does not run main.ts, so the global filter that
    // shapes the error envelope has to be registered here too.
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('accepts a valid file under the size limit and saves it to disk', async () => {
    const res = await request(app.getHttpServer())
      .post('/uploads')
      .attach('file', Buffer.from('fake png bytes'), {
        filename: 'id.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      filename: expect.any(String),
      size: expect.any(Number),
      mimetype: 'image/png',
    });

    // The returned filename must correspond to a real file in UPLOAD_DIR.
    expect(existsSync(join(uploadDir, res.body.filename))).toBe(true);
  });

  it('rejects an oversized file with 400', async () => {
    const sixMB = Buffer.alloc(6 * 1024 * 1024, 0);

    const res = await request(app.getHttpServer())
      .post('/uploads')
      .attach('file', sixMB, {
        filename: 'too-big.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);

    // Nothing oversized should have been left behind on disk.
    const files = await readdir(uploadDir);
    expect(files.some((f) => f.includes('too-big'))).toBe(false);
  });

  it('rejects a wrong-mimetype file with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/uploads')
      .attach('file', Buffer.from('plain text, not an ID doc'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);

    // The rejected file must not have been written to disk.
    const files = await readdir(uploadDir);
    expect(files.some((f) => f.includes('notes'))).toBe(false);
  });
});
