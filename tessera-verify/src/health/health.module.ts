import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import { HealthController } from './health.controller.js';
import { REDIS_CLIENT } from './health.constants.js';

@Module({
  controllers: [HealthController],
  providers: [
    {
      // Nest can't build an ioredis client itself: it's a third-party class,
      // and it needs REDIS_URL, which only exists at boot. So we hand Nest the
      // recipe (useFactory) and the ingredient it needs (inject: ConfigService).
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>('REDIS_URL'), {
          // A health check must fail fast, not hang. By default ioredis queues
          // commands while disconnected and waits to reconnect; these two
          // options make a command reject immediately when Redis is down.
          // The client still reconnects in the background, so /health recovers
          // on its own once Redis is back.
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        }),
      inject: [ConfigService],
    },
  ],
})
export class HealthModule {}
