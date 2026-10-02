import { Injectable } from '@nestjs/common';

@Injectable()
export class PersonsService {

  /* This will be the service that is called by the controller to register a citizen. It might be async as there is gonna be a database operation here. Also I think here is a good place to add a repository to talk with postgres */
}
