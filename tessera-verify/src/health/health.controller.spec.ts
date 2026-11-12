import { describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';

import { HealthController } from './health.controller.js';
import { REDIS_CLIENT } from './health.constants.js';

describe('HealthController', () => {
  // Build the controller with a FAKE Redis client swapped in for the real one.
  // We can do this because the controller injects by the REDIS_CLIENT token,
  // so the test hands it any object with a ping() method.
  async function buildWith(fakeRedis: { ping: () => Promise<string> }) {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: REDIS_CLIENT, useValue: fakeRedis }],
    }).compile();

    return moduleRef.get(HealthController);
  }

  it('reports ok when Redis answers the ping', async () => {
    const fakeRedis = { ping: vi.fn().mockResolvedValue('PONG') };
    const controller = await buildWith(fakeRedis);

    await expect(controller.checkHealth()).resolves.toEqual({
      status: 'ok',
      redis: 'up',
    });
    expect(fakeRedis.ping).toHaveBeenCalledOnce();
  });

  it('throws 503 Service Unavailable when the ping fails', async () => {
    const fakeRedis = {
      ping: vi.fn().mockRejectedValue(new Error('connection refused')),
    };
    const controller = await buildWith(fakeRedis);

    await expect(controller.checkHealth()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
