import { describe, it, expect, vi } from 'vitest';

import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    UPLOAD_DIR: './uploads',
  };

  it('returns the parsed env when all required keys are present', () => {
    expect(validateEnv(validEnv)).toEqual(validEnv);
  });

  it('throws when every required key is missing', () => {
    // console.error is noise here; silence it so the suite output stays clean
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => validateEnv({})).toThrow('Invalid environment configuration');
  });

  it('throws when a single required key is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { UPLOAD_DIR, ...missingUploadDir } = validEnv;

    expect(() => validateEnv(missingUploadDir)).toThrow(
      'Invalid environment configuration',
    );
  });
});
