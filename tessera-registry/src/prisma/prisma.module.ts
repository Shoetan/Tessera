import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';


@Global()
@Module({
  providers: [PrismaService], // Nest creates the one instance here
  exports: [PrismaService], // and lets other modules use it
})
export class PrismaModule {}
