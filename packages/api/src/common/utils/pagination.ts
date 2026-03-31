const MIN_PAGE = 1;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export interface PaginationParams {
  skip: number;
  take: number;
}

export function getPaginationParams(page?: number, pageSize?: number): PaginationParams {
  const safePage = Math.max(MIN_PAGE, Number(page) || MIN_PAGE);
  const safePageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(MIN_PAGE_SIZE, Number(pageSize) || DEFAULT_PAGE_SIZE),
  );

  return {
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  };
}
