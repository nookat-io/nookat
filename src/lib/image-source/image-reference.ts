export const DOCKER_HUB = 'docker.io';
export const OFFICIAL_NAMESPACE = 'library';

const LEGACY_DOCKER_HUB = 'index.docker.io';
const MAX_NAME_LENGTH = 255;

const DOMAIN_COMPONENT = '(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])';
const DOMAIN_NAME = `${DOMAIN_COMPONENT}(?:\\.${DOMAIN_COMPONENT})*`;
const IPV6_LITERAL = '\\[[a-fA-F0-9:]+\\]';
const REGISTRY = new RegExp(`^(${DOMAIN_NAME}|${IPV6_LITERAL})(?::[0-9]+)?$`);
const PATH_COMPONENT = /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/;
const TAG = /^\w[\w.-]{0,127}$/;
const DIGEST =
  /^[A-Za-z][A-Za-z0-9]*(?:[-_+.][A-Za-z][A-Za-z0-9]*)*:[0-9a-fA-F]{32,}$/;

export interface ImageReference {
  registry: string;
  path: string;
  tag?: string;
  digest?: string;
}

export function parseRegistryHost(registry: string): string | null {
  const match = REGISTRY.exec(registry);
  return match ? match[1].toLowerCase() : null;
}

function splitOnce(text: string, separator: string, from = 0) {
  const index = text.indexOf(separator, from);
  return index === -1
    ? { before: text, after: undefined }
    : { before: text.slice(0, index), after: text.slice(index + 1) };
}

function looksLikeRegistry(component: string) {
  return (
    component.includes('.') ||
    component.includes(':') ||
    component === 'localhost' ||
    component !== component.toLowerCase()
  );
}

function splitRegistry(name: string) {
  const { before: first, after: rest } = splitOnce(name, '/');
  if (rest === undefined || !looksLikeRegistry(first)) {
    return { registry: DOCKER_HUB, path: name };
  }
  return {
    registry: first === LEGACY_DOCKER_HUB ? DOCKER_HUB : first,
    path: rest,
  };
}

export function parseImageReference(text: string): ImageReference | null {
  const { before: named, after: digest } = splitOnce(text, '@');
  const { before: name, after: tag } = splitOnce(
    named,
    ':',
    named.lastIndexOf('/') + 1
  );

  if (
    name.length > MAX_NAME_LENGTH ||
    (tag !== undefined && !TAG.test(tag)) ||
    (digest !== undefined && !DIGEST.test(digest))
  ) {
    return null;
  }

  const { registry, path } = splitRegistry(name);
  const explicitRegistryIsValid =
    registry === DOCKER_HUB || parseRegistryHost(registry) !== null;
  if (
    !explicitRegistryIsValid ||
    !path.split('/').every(component => PATH_COMPONENT.test(component))
  ) {
    return null;
  }

  const fullPath =
    registry === DOCKER_HUB && !path.includes('/')
      ? `${OFFICIAL_NAMESPACE}/${path}`
      : path;
  return { registry, path: fullPath, tag, digest };
}
