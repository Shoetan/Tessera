import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreatePersonDto } from './persons.dto.js';
import { PersonsService } from './persons.service.js';

@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService:PersonsService) {}

  
  @Post() 
  registerPerson( @Body() createPersonDto:CreatePersonDto){
    return this.personsService.registerPerson(createPersonDto);

  }


  @Get(':id')
  findPersonById( @Param('id') id: string){
    return this.personsService.findPersonById(id);
  }


}
