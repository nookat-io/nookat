import { ProgressState } from './types';

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
