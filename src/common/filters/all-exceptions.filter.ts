import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import type { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

interface MongoServerError {
  code?: number;
  keyValue?: Record<string, unknown>;
}

function isMongoDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as MongoServerError).code === 11000
  );
}

function extractValidationMessages(
  exception: MongooseError.ValidationError,
): string {
  return (
    Object.values(exception.errors)
      .map((error) => error.message)
      .join(', ') || 'Validation failed'
  );
}

function extractMessage(exception: HttpException): string {
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  const body = response as { message?: unknown; error?: unknown };
  const { message } = body;

  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string') {
    return message;
  }
  if (typeof body.error === 'string') {
    return body.error;
  }

  return exception.message;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = extractMessage(exception);
    } else if (isMongoDuplicateKeyError(exception)) {
      status = HttpStatus.CONFLICT;
      const keyValue = (exception as MongoServerError).keyValue ?? {};
      const field = Object.keys(keyValue)[0];
      message = field
        ? `Duplicate value for ${field}`
        : 'Resource already exists';
    } else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = extractValidationMessages(exception);
    } else if (exception instanceof MongooseError.DocumentNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = 'Resource no longer exists';
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      status: 'error',
      message,
      statusCode: status,
      data: null,
    };

    response.status(status).json(body);
  }
}
