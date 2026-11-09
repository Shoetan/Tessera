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
  constructor(private readonly prisma: PrismaService) {}

  async record(tx: Prisma.TransactionClient, entry: AuditEntryInput) {
    await tx.auditEntry.create({
      data: {
        personId: entry.personId,
        action: entry.action,
        changes: entry.changes,
        actor: entry.actor,
        reason: entry.reason,
      },
    });
  }

  async findForPerson(personId: string, limit: number, cursor?: string) {
    const entries = await this.prisma.auditEntry.findMany({
      where: { personId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > limit;
    const items = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }
}