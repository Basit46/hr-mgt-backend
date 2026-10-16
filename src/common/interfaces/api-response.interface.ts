export type ApiStatus = 'success' | 'error';

export interface ApiResponse<T> {
  status: ApiStatus;
  message: string;
  statusCode: number;
  data: T | null;
  count?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
}

export type ApiSuccessResponse<T> = ApiResponse<T> & { status: 'success' };

export type ApiErrorResponse<T = never> = ApiResponse<T> & {
  status: 'error';
  data: null;
};

export const RESPONSE_MESSAGE_KEY = 'api_response_message';
