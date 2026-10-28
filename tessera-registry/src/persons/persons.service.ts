import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePersonDto } from './persons.dto.js';
import { generateNationalId } from './national-id/national-id.js';

@Injectable()
export class PersonsService {

  /* This will be the service that is called by the controller to register a citizen. It might be async as there is gonna be a database operation here. Also I think here is a good place to add a repository to talk with postgres */

  constructor( private readonly prisma: PrismaService ) {}

  async registerPerson(dto: CreatePersonDto) {

    const nationalId = generateNationalId()
    return await this.prisma.person.create({data:{
      givenName: dto.givenName,
      familyName: dto.familyName,
      dateOfBirth: new Date(dto.dateOfBirth),
      gender: dto.gender,
      nationalId: nationalId
    }})
  }
}

