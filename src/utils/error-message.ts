const hasMessage = (error: unknown): error is { message: string } =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string';

export function errorMessage(
  error: unknown,
  fallback = 'An unknown error occurred'
): string {
  if (typeof error === 'string' && error) {
    return error;
  }
  if (hasMessage(error) && error.message) {
    return error.message;
  }
  return fallback;
}
