import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  ApiSuccessResponse,
  PaginatedResult,
  RESPONSE_MESSAGE_KEY,
} from '../interfaces/api-response.interface';

const DEFAULT_MESSAGE = 'Operation completed successfully';

const NO_CONTENT_STATUS = 204 satisfies number;

function isStreamLike(value: unknown): boolean {
  if (value instanceof StreamableFile) return true;
  if (Buffer.isBuffer(value)) return true;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { pipe?: unknown }).pipe === 'function'
  );
}

function isStandardResponse(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    'status' in candidate &&
    'message' in candidate &&
    'statusCode' in candidate &&
    'data' in candidate
  );
}

function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.data) && typeof candidate.count === 'number';
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_MESSAGE;

    const http = context.switchToHttp();
    const response = http.getResponse<{ statusCode?: number }>();
    const statusCode: number = response?.statusCode ?? HttpStatus.OK;
    const isNoContent = statusCode === NO_CONTENT_STATUS;

    return next.handle().pipe(
      map((payload): ApiResponse<T> | T => {
        if (isNoContent) {
          return payload;
        }
        if (isStreamLike(payload) || isStandardResponse(payload)) {
          return payload;
        }

        if (isPaginatedResult(payload)) {
          return {
            status: 'success',
            message,
            statusCode,
            data: payload.data as T,
            count: payload.count,
          } satisfies ApiSuccessResponse<T>;
        }

        const data = (payload ?? null) as T | null;
        return {
          status: 'success',
          message,
          statusCode,
          data,
        } satisfies ApiSuccessResponse<T>;
      }),
    );
  }
}
