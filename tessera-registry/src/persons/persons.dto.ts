import { IsDateString, IsEnum, IsNotEmpty, IsString } from "class-validator";
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

  @IsDateString() /* e.g. "1990-05-17" */
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;
}
