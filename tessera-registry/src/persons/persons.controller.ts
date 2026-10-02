import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreatePersonDto } from './persons.dto.js';

@Controller('person')
export class PersonsController {
  @Get()
  getAllPersons(){
    return "This is a test endpoint for persons. It will return all persons in the database.";
  }

  /* This will be the register person endpoint I will have to get the registration data from the body of the request. Also it will be a Post method. Also remember to inject the service to be called. Things to figure out now is how to pass the body to the service and how to rip it out fromt the request. Remember to validate the request body do not allow empty body and field names*/
  
  @Post() 
  registerPerson( @Body() createPersonDto:CreatePersonDto){
    return `This is a test endpoint for registering a person. This is the information coming from the request body:  ${createPersonDto}`;
  }
}
