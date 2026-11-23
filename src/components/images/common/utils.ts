import {
  DOCKER_HUB,
  normalizeRegistry,
  parseImageReference,
} from '../../../lib/image-source';
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

export const normalizePullData = ({
  imageName,
  tag,
  registry,
}: PullFormData): PullFormData => ({
  imageName: imageName.trim(),
  tag,
  registry: normalizeRegistry(registry),
});

export function pullReference(pullData: PullFormData) {
  const { registry, imageName, tag } = normalizePullData(pullData);
  const repository =
    registry === DOCKER_HUB ? imageName : `${registry}/${imageName}`;
  return tag ? `${repository}:${tag}` : repository;
}

export function pullReferenceProblem(pullData: PullFormData): string | null {
  const reference = pullReference(pullData);
  const parsed = parseImageReference(reference);
  if (!parsed) {
    return `${reference} is not a valid image reference`;
  }
  const [registryHost] = normalizePullData(pullData).registry.split('/');
  if (parsed.registry !== registryHost) {
    return `${registryHost} is not a registry address, so Docker would pull from Docker Hub. Add its domain or port, such as ${registryHost}:5000`;
  }
  return null;
}

export const DEFAULT_PROGRESS_STATE: ProgressState = {
  isRunning: false,
  progress: '',
  error: null,
  success: false,
  cancelled: false,
};
