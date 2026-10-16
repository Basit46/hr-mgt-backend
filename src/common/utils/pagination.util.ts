export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(page?: string, limit?: string): Pagination {
  const parsedPage = Number.parseInt(page ?? '', 10);
  const parsedLimit = Number.parseInt(limit ?? '', 10);

  const safePage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;
  const safeLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}
