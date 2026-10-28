import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePersonDto } from './persons.dto.js';
import { generateNationalId } from './national-id/national-id.js';
import { PersonNotFoundException } from '../common/exceptions/person-not-found.exception.js';

@Injectable()
export class PersonsService {


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


  async findPersonById(id: string) {
    const person = await this.prisma.person.findUnique({where: {id: id}})

    if (!person) {
      throw new PersonNotFoundException(id);
    }

    return person;
  }
}

