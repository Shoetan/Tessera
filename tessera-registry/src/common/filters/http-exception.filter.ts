import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { Request, Response } from 'express';

/* The one error shape every failed request gets back */
export interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch() /* No arguments means catch everything, not just HttpExceptions */
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { error, message } = this.extractErrorAndMessage(exception, status);

    if (status >= 500) {
      /* Log the real error and stack so we can debug it; the client only sees the generic message */
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} -> ${status} ${JSON.stringify(message)}`,
      );
    }

    const body: ErrorEnvelope = {
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  /*
   * getResponse() is either a plain string, or an object like
   * { statusCode, error, message } (ValidationPipe puts a string[] in message).
   * Flatten both into the same two fields so the envelope never nests.
   */
  private extractErrorAndMessage(
    exception: unknown,
    status: number,
  ): { error: string; message: string | string[] } {
    const defaultError = HttpStatus[status] ?? 'Error';

    if (!(exception instanceof HttpException)) {
      return { error: 'Internal Server Error', message: 'Internal server error' };
    }

    const res = exception.getResponse();

    if (typeof res === 'string') {
      return { error: defaultError, message: res };
    }

    const { error, message } = res as { error?: string; message?: string | string[] };
    return {
      error: error ?? defaultError,
      message: message ?? exception.message,
    };
  }
}
