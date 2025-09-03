import { ErrorWithMessage } from './types';

// Type guard to check if an object has a message property
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Format large numbers for display
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

// Extract error message from various error types
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

// Parse build args from string to key-value pairs
export function parseBuildArgs(
  buildArgsString: string
): Record<string, string> {
  const buildArgs: Record<string, string> = {};
  if (buildArgsString.trim()) {
    buildArgsString.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        buildArgs[key.trim()] = value.trim();
      }
    });
  }
  return buildArgs;
}

// Default form values
export const DEFAULT_PULL_DATA = {
  imageName: '',
  tag: 'latest',
  registry: 'docker.io',
};

export const DEFAULT_BUILD_DATA = {
  dockerfilePath: '',
  buildContext: '',
  imageName: '',
  tag: 'latest',
  buildArgs: '',
  noCache: false,
  pull: false,
};

export const DEFAULT_PROGRESS_STATE = {
  isRunning: false,
  progress: '',
  error: null,
  success: false,
};
