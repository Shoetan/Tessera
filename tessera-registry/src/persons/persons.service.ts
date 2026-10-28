import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePersonDto } from './persons.dto.js';
import { generateNationalId } from './national-id/national-id.js';
import { PersonNotFoundException } from '../common/exceptions/person-not-found.exception.js';
import { Prisma } from '../generated/prisma/client.js';

// A taken national ID is retried with a fresh one, but never forever (Decisions Log, 2026-10-07)
const MAX_ATTEMPTS = 3;

@Injectable()
export class PersonsService {


  constructor( private readonly prisma: PrismaService ) {}

  async registerPerson(dto: CreatePersonDto) {

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      
      const nationalId = generateNationalId()

      try {
        return await this.prisma.person.create({data:{
          givenName: dto.givenName,
          familyName: dto.familyName,
          dateOfBirth: dto.dateOfBirth,
          gender: dto.gender,
          nationalId: nationalId
        }})
      } catch (error) {
        // P2002 = the database's UNIQUE rule says this national ID is already taken
        const isCollision =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

        if (!isCollision || attempt === MAX_ATTEMPTS) {
          throw error;
        }
      }
    }

    // unreachable: the last attempt either returns or throws; this keeps TypeScript satisfied
    throw new Error('registerPerson: retry loop ended without a result');
  }


  async findPersonById(id: string) {
    const person = await this.prisma.person.findUnique({where: {id: id}})

    if (!person) {
      throw new PersonNotFoundException(id);
    }

    return person;
  }
}

