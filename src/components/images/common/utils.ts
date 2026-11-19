import { DOCKER_HUB } from '../../../lib/image-source';
import { PullFormData, ProgressState, TagStatus } from './types';

export const DEFAULT_TAG = 'latest';

const TAG_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;

export const isValidTag = (tag: string) => TAG_PATTERN.test(tag);

export const canPullWithTag = (status: TagStatus) =>
  status.kind === 'found' ||
  status.kind === 'unknown' ||
  status.kind === 'unchecked';

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
  tag: '',
  registry: DOCKER_HUB,
};

export const trimPullData = ({
  imageName,
  tag,
  registry,
}: PullFormData): PullFormData => ({
  imageName: imageName.trim(),
  tag,
  registry: registry.trim(),
});

export function pullReference(pullData: PullFormData) {
  const { registry, imageName, tag } = trimPullData(pullData);
  const repository =
    registry === DOCKER_HUB ? imageName : `${registry}/${imageName}`;
  return tag ? `${repository}:${tag}` : repository;
}

export const DEFAULT_PROGRESS_STATE: ProgressState = {
  isRunning: false,
  progress: '',
  error: null,
  success: false,
};
