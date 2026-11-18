import { ErrorWithMessage } from './types';
import { ProgressState } from './types';

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'toString' in error) {
    return String(error);
  }
  return 'An unknown error occurred';
}

export const DEFAULT_PULL_DATA = {
  imageName: '',
  tag: 'latest',
  registry: 'docker.io',
};

export const DEFAULT_PROGRESS_STATE: ProgressState = {
  isRunning: false,
  progress: '',
  error: null,
  success: false,
};
