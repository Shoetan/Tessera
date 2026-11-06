import { ConflictException} from '@nestjs/common';

export class PersonAlreadyInactiveException extends ConflictException {
  constructor(personId: string) {
    super(`Person with id "${personId}" is already inactive`);
  }
}
