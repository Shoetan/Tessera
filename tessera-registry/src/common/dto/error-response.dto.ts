import { ApiProperty } from '@nestjs/swagger';

/* The ErrorEnvelope from http-exception.filter.ts, as a class so Swagger can show it.
 * Documentation only: the filter is what actually builds this shape. */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Not Found' })
  error: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Person with id "3f2b8c1e-6d4a-4f7e-9b2c-1a5d7e9f0c3b" was not found',
  })
  message: string | string[];

  @ApiProperty({ example: '/persons/3f2b8c1e-6d4a-4f7e-9b2c-1a5d7e9f0c3b' })
  path: string;

  @ApiProperty({ example: '2026-10-28T19:04:51.000Z' })
  timestamp: string;
}
