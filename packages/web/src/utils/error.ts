/**
 * Extracts a user-friendly error message from an RTK Query error response.
 * Avoids using `any` type while safely accessing nested error data.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as { data?: { message?: string } };
  return apiError?.data?.message || fallback;
}
