import { Image } from '../../images/image-types';

export interface PullTarget {
  imageName: string;
  tag: string;
  registry: string;
}

const DOCKER_HUB = 'docker.io';
const DOCKER_HUB_ALIASES =
  /^(docker\.io|index\.docker\.io|registry-1\.docker\.io)\//;
const OFFICIAL_NAMESPACE = /^library\//;
const DEFAULT_TAG = 'latest';

function registryOf(reference: string): string | null {
  const slash = reference.indexOf('/');
  if (slash === -1) {
    return null;
  }
  const first = reference.slice(0, slash);
  const namesARegistry =
    first.includes('.') || first.includes(':') || first === 'localhost';
  return namesARegistry ? first : null;
}

function hasTagOrDigest(reference: string): boolean {
  const lastSegment = reference.slice(reference.lastIndexOf('/') + 1);
  return lastSegment.includes(':') || reference.includes('@');
}

export function normalizeImageReference(reference: string): string {
  const trimmed = reference.trim();
  if (trimmed === '') {
    return '';
  }
  const withoutHub = trimmed.replace(DOCKER_HUB_ALIASES, '');
  const shortened =
    registryOf(withoutHub) === null
      ? withoutHub.replace(OFFICIAL_NAMESPACE, '')
      : withoutHub;
  return hasTagOrDigest(shortened) ? shortened : `${shortened}:${DEFAULT_TAG}`;
}

export function pullTarget(reference: string): PullTarget | null {
  const normalized = normalizeImageReference(reference);
  if (normalized === '' || normalized.includes('@')) {
    return null;
  }
  const registry = registryOf(normalized);
  const path = registry ? normalized.slice(registry.length + 1) : normalized;
  const tagSeparator = path.lastIndexOf(':');
  return {
    imageName: path.slice(0, tagSeparator),
    tag: path.slice(tagSeparator + 1),
    registry: registry ?? DOCKER_HUB,
  };
}

export function localImageReference(image: Image): string | null {
  if (image.dangling || !image.repository || !image.tag) {
    return null;
  }
  return `${image.repository}:${image.tag}`;
}
