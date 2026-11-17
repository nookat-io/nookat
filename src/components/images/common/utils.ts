import { DOCKER_HUB } from '../../../lib/image-source';
import { PullFormData, ProgressState } from './types';

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

export const DEFAULT_PULL_DATA: PullFormData = {
  imageName: '',
  tag: 'latest',
  registry: DOCKER_HUB,
};

export const pullReference = ({ registry, imageName, tag }: PullFormData) =>
  registry === DOCKER_HUB
    ? `${imageName}:${tag}`
    : `${registry}/${imageName}:${tag}`;

export const DEFAULT_PROGRESS_STATE: ProgressState = {
  isRunning: false,
  progress: '',
  error: null,
  success: false,
};
