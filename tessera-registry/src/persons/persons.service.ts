import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePersonDto, DeactivatePersonDto, UpdatePersonDto } from './persons.dto.js';
import { generateNationalId } from './national-id/national-id.js';
import { PersonNotFoundException } from '../common/exceptions/person-not-found.exception.js';
import { Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { PersonAlreadyInactiveException } from '../common/exceptions/person-already-inactive.exception.js';

// A taken national ID is retried with a fresh one, but never forever (Decisions Log, 2026-10-07)
const MAX_ATTEMPTS = 3;

@Injectable()
export class PersonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async registerPerson(dto: CreatePersonDto, actor: string) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const nationalId = generateNationalId();

      try {
        return await this.prisma.$transaction(async (tx) => {
          const person = await tx.person.create({
            data: {
              givenName: dto.givenName,
              familyName: dto.familyName,
              dateOfBirth: dto.dateOfBirth,
              gender: dto.gender,
              nationalId: nationalId,
            },
          });

          await this.auditService.record(tx, {
            personId: person.id,
            action: 'created',
            changes: {
              givenName: { from: null, to: person.givenName },
              familyName: { from: null, to: person.familyName },
              dateOfBirth: { from: null, to: person.dateOfBirth },
              gender: { from: null, to: person.gender },
              nationalId: { from: null, to: person.nationalId },
            },
            actor: actor,
          });
          return person;
        });
      } catch (error) {
        // P2002 = the database's UNIQUE rule says this national ID is already taken
        const isCollision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';

        if (!isCollision || attempt === MAX_ATTEMPTS) {
          throw error;
        }
      }
    }

    // unreachable: the last attempt either returns or throws; this keeps TypeScript satisfied
    throw new Error('registerPerson: retry loop ended without a result');
  }

  async findPersonById(id: string) {
    const person = await this.prisma.person.findUnique({ where: { id: id } });

    if (!person) {
      throw new PersonNotFoundException(id);
    }

    return person;
  }

  async updatePerson(id: string, dto: UpdatePersonDto, actor: string) {
    return this.prisma.$transaction(async (tx) => {
      const person = await tx.person.findUnique({ where: { id: id } });

      if (!person) {
        throw new PersonNotFoundException(id);
      }

      const changes: Record<
        string,
        { from: Prisma.InputJsonValue | null; to: Prisma.InputJsonValue | null }
      > = {};

      const fields = [
        'givenName',
        'familyName',
        'dateOfBirth',
        'gender',
      ] as const;

      for (const field of fields) {
        if (field === 'dateOfBirth') {
          if (
            dto.dateOfBirth !== undefined &&
            dto.dateOfBirth.getTime() !== person.dateOfBirth.getTime()
          ) {
            changes.dateOfBirth = {
              from: person.dateOfBirth,
              to: dto.dateOfBirth,
            };
          }
        } else {
          if (dto[field] !== undefined && dto[field] !== person[field]) {
            changes[field] = { from: person[field], to: dto[field] };
          }
        }
      }

      if (Object.keys(changes).length === 0) {
        return person;
      } // if nothing is updated in changes

      const updatedPerson = await tx.person.update({
        where: { id: id },
        data: {
          // Update fields as necessary
          givenName: dto.givenName ?? person.givenName,
          familyName: dto.familyName ?? person.familyName,
          dateOfBirth: dto.dateOfBirth ?? person.dateOfBirth,
          gender: dto.gender ?? person.gender,
        },
      });

      await this.auditService.record(tx, {
        personId: updatedPerson.id,
        action: 'updated',
        reason: dto.reason,
        changes: changes,
        actor: actor,
      });

      return updatedPerson;
    });
  }

  async deactivatePerson(id: string, dto: DeactivatePersonDto, actor: string) {

    return this.prisma.$transaction (async (tx) => {

       const person = await tx.person.findUnique({ where: { id: id } });

       if (!person) {
         throw new PersonNotFoundException(id);
       }

       if(person.status === "inactive") {throw new PersonAlreadyInactiveException(id)}

       const updatedPersonStatus = await tx.person.update({
        where:{id:id},
        data:{
          status:"inactive"
        }
       })

       await this.auditService.record(tx, {
         personId: updatedPersonStatus.id,
         action: 'deactivated',
         reason: dto.reason,
         changes: {status:{from:person.status, to:updatedPersonStatus.status}},
         actor: actor,
       });


       return updatedPersonStatus


    }) 

    

  }

  async getAuditHistory (id:string, limit:number, cursor?: string) {
    await this.findPersonById(id)
    return this.auditService.findForPerson(id, limit, cursor);

  }
}


