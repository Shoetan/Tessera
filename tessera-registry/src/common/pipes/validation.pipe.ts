import { ValidationPipe } from '@nestjs/common';

/*
 * The one ValidationPipe config for the app, shared by main.ts and e2e tests.
 * whitelist: drop properties with no class-validator decorator
 * forbidNonWhitelisted: ...and reject the request with 400 instead of silently dropping them
 * transform: turn the plain JSON body into an instance of the DTO class (and convert types)
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}
