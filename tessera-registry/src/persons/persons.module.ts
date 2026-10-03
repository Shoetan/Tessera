import { Module } from '@nestjs/common';
import { PersonsController } from './persons.controller.js';
import { PersonsService } from './persons.service.js';

@Module({
  controllers: [PersonsController],
  providers: [PersonsService]
})
export class PersonsModule {}
