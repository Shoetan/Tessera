import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Redis } from 'ioredis';

import { REDIS_CLIENT } from './health.constants.js';

@Controller('health')
export class HealthController {
  // Injected by token, not by type, because REDIS_CLIENT is a factory provider.
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  @Get()
  async checkHealth() {
    try {
      await this.redis.ping();
      return { status: 'ok', redis: 'up' };
    } catch (error) {
      throw new ServiceUnavailableException('Redis is down', { cause: error });
    }
  }
}
