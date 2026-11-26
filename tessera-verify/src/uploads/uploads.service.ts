import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {}

  async saveFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('no file uploaded');
    }

    // validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('invalid file type');
    }

    // --- NEW: all checks passed, so save the file to disk ---
    const uploadDir = this.configService.get<string>('UPLOAD_DIR');
    if (!uploadDir) {
      throw new Error('UPLOAD_DIR is not configured');
    }

    // make sure the folder exists, then write the file into it
    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}${extname(file.originalname)}`;
    await writeFile(join(uploadDir, filename), file.buffer);

    return { filename, size: file.size, mimetype: file.mimetype };
  }
}
