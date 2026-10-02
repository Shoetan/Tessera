import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';


@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    // The adapter uses the "pg" library. It owns the connection pool.
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: 10, // most connections this app can open
      idleTimeoutMillis: 30_000, // close a connection nobody used for 30s
      connectionTimeoutMillis: 5_000, // give up if no connection is free after 5s
    });
    super({ adapter, log: ['warn', 'error'] });
  }

  async onModuleInit() {
    await this.$connect(); // fail at start if the database is not reachable
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect(); // close the pool when the app stops
  }
}
