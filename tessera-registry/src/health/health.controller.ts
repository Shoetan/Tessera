import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}


  @Get()
    async checkHealth (){

      try {
         await this.prismaService.$queryRaw`SELECT 1`;
         return { status: 'ok', database: 'up' };
      } catch (error) {
        throw new ServiceUnavailableException('Database is down', {cause: error});
      }

       
     
    }
}
