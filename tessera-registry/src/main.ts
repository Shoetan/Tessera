import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // so PrismaService.onModuleDestroy() is called
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Tessera Registry')
    .setDescription(
      'Foundational identity registry. Persons are deactivated, never deleted, ' +
        'and every mutation is written to an append-only audit log.',
    )
    .setVersion('0.1.0')
    .addTag('persons', 'Create, read, update and deactivate person records')
    .addTag('audit', 'The immutable change history of a person')
    .addTag('health', 'Liveness and database connectivity')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    jsonDocumentUrl: 'api-json', // import this into Postman if you want a collection
  });

  await app.listen(process.env.PORT ?? 5000);
}
await bootstrap();
