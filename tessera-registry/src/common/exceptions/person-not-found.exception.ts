import { NotFoundException } from '@nestjs/common';

export class PersonNotFoundException extends NotFoundException {
  constructor(personId: string) {
    super(`Person with id "${personId}" was not found`);
  }
}
