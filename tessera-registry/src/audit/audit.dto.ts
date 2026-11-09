import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { AuditAction } from "../generated/prisma/enums.js";




export class AuditEntryResponseDto {
  @ApiProperty({ example: '9a1c4e2b-7f3d-4b8a-a6e1-2d5c8f0b3e74' })
  id: string;

  @ApiProperty({ example: '3f2b8c1e-6d4a-4f7e-9b2c-1a5d7e9f0c3b' })
  personId: string;

  @ApiProperty({ enum: AuditAction, example: AuditAction.updated })
  action: AuditAction;

  @ApiProperty({
    type: Object,
    example: { givenName: { from: 'Ada', to: 'Adaeze' } },
  })
  changes: Record<string, unknown>;

  @ApiProperty({ example: 'system' })
  actor: string;

  @ApiPropertyOptional({
    type:String,
    nullable: true,
    example: 'Corrected spelling from birth certificate',
  })
  reason: string | null;

  @ApiProperty({ example: '2026-10-28T19:04:51.000Z' })
  createdAt: Date;
}


export class AuditHistoryResponseDto {
  @ApiProperty({
    type: [AuditEntryResponseDto],
  })
  items: AuditEntryResponseDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    example: '9a1c4e2b-7f3d-4b8a-a6e1-2d5c8f0b3e74',
    description:
      'Pass this as cursor to get to the next page; null on the last page',
  })
  nextCursor: string | null;
}