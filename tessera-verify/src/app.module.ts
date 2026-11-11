import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:true,
      envFilePath:'.env',
      validate:validateEnv

    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
