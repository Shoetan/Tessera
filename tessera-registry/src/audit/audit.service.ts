import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '../generated/prisma/client.js';


interface AuditEntryInput {
  personId: string;
  action: AuditAction;
  changes: Prisma.InputJsonValue;
  actor: string;
  reason?: string;
}

@Injectable()


export class AuditService {

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

}