import { Type } from "class-transformer";
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, MaxDate } from "class-validator";
import { Gender } from "../generated/prisma/enums.js";

/* Data coming from the request body.
 * status, createdAt and updatedAt are set by the server, so the client can't send them. */

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  givenName: string;

  @IsString()
  @IsNotEmpty()
  familyName: string;

  @Type(() => Date) /* "1990-05-17" in the request becomes a real Date */
  @IsDate()
  @MaxDate(() => new Date()) /* worked out on every request, so "now" is always today */
  dateOfBirth: Date;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;
}
