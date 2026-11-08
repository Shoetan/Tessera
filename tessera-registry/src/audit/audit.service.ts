import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';


interface AuditEntryInput {
  personId: string;
  action: AuditAction;
  changes: Prisma.InputJsonValue;
  actor: string;
  reason?: string;
}

@Injectable()


export class AuditService {

   constructor(
      private readonly prisma: PrismaService,

    ) {}

async record (tx : Prisma.TransactionClient, entry: AuditEntryInput) {
  await tx.auditEntry.create({
    data: {
      personId: entry.personId,
      action: entry.action,
      changes: entry.changes,
      actor: entry.actor,
      reason: entry.reason
    }
  })
}

async findForPerson (personId:string) {
  return this.prisma.auditEntry.findMany({where:{personId}, orderBy:[{createdAt:"asc"},{id:"asc"}]})
}

}