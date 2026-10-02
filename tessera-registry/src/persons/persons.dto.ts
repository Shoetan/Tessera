import { Gender, PersonStatus } from "./types/index.js";



/* Data coming from the request body */
export class CreatePersonDto {
  givenName: string;
  familyName: string;
  dateOfBirth: Date;
  gender: Gender;
  status: PersonStatus;
  createdAt: Date;
  updatedAt: Date;

}


