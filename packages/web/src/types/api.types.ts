export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: PaginationMeta;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
}
