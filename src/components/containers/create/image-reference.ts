import {
  DOCKER_HUB,
  ImageReference,
  OFFICIAL_NAMESPACE,
  parseImageReference,
} from '../../../lib/image-source';
import { Image } from '../../images/image-types';

export interface PullTarget {
  imageName: string;
  tag: string;
  registry: string;
}

const DEFAULT_TAG = 'latest';
const OFFICIAL_PREFIX = `${OFFICIAL_NAMESPACE}/`;

function repositoryOnRegistry({ registry, path }: ImageReference): string {
  if (registry !== DOCKER_HUB) {
    return path;
  }
  return path.startsWith(OFFICIAL_PREFIX)
    ? path.slice(OFFICIAL_PREFIX.length)
    : path;
}

function localName(reference: ImageReference): string {
  const repository = repositoryOnRegistry(reference);
  return reference.registry === DOCKER_HUB
    ? repository
    : `${reference.registry}/${repository}`;
}

export function normalizeImageReference(reference: string): string {
  const trimmed = reference.trim();
  const parsed = parseImageReference(trimmed);
  if (!parsed) {
    return trimmed;
  }
  const name = localName(parsed);
  if (parsed.digest) {
    return parsed.tag
      ? `${name}:${parsed.tag}@${parsed.digest}`
      : `${name}@${parsed.digest}`;
  }
  return `${name}:${parsed.tag ?? DEFAULT_TAG}`;
}

export function pullTarget(reference: string): PullTarget | null {
  const parsed = parseImageReference(reference.trim());
  if (!parsed || parsed.digest) {
    return null;
  }
  return {
    imageName: repositoryOnRegistry(parsed),
    tag: parsed.tag ?? DEFAULT_TAG,
    registry: parsed.registry,
  };
}

export function localImageReference(image: Image): string | null {
  if (image.dangling || !image.repository || !image.tag) {
    return null;
  }
  return `${image.repository}:${image.tag}`;
}
