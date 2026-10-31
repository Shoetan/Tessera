import { Module } from '@nestjs/common';
import { PersonsController } from './persons.controller.js';
import { PersonsService } from './persons.service.js';
import {AuditModule} from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [PersonsController],
  providers: [PersonsService]
})
export class PersonsModule {}
