import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/* Query params for cursor-based list endpoints: ?cursor=<id>&limit=20 */
export class CursorPaginationQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number) /* query params arrive as strings */
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit: number = DEFAULT_PAGE_LIMIT;
}

/* What a cursor-based list endpoint returns; nextCursor is null on the last page */
export class PaginatedResponseDto<T> {
  data: T[];
  nextCursor: string | null;
}
