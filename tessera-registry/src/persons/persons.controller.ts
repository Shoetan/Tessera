import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreatePersonDto } from './persons.dto.js';
import { PersonsService } from './persons.service.js';

@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService:PersonsService) {}

  @Get()
  getAllPersons(){
    return "This is a test endpoint for persons. It will return all persons in the database.";
  }
  
  @Post() 
  registerPerson( @Body() createPersonDto:CreatePersonDto){
    return this.personsService.registerPerson(createPersonDto);

  }
}
