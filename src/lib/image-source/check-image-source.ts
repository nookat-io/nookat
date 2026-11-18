import { damerauLevenshteinDistance } from '../../utils/edit-distance';
import {
  DOCKER_HUB,
  OFFICIAL_NAMESPACE,
  parseImageReference,
  parseRegistryHost,
} from './image-reference';
import {
  KNOWN_REGISTRIES,
  KnownRegistry,
  OFFICIAL_IMAGES,
  POPULAR_OFFICIAL_IMAGES,
} from './known-sources';

export type ImageSourceCheck =
  | { kind: 'known-registry'; registry: string }
  | { kind: 'internal-registry'; registry: string }
  | { kind: 'unknown-registry'; registry: string }
  | { kind: 'lookalike-registry'; registry: string; resembles: KnownRegistry }
  | { kind: 'lookalike-image'; image: string; resembles: string }
  | { kind: 'invalid' };

export type RegistryCheck = Exclude<
  ImageSourceCheck,
  { kind: 'lookalike-image' }
>;

const INTERNAL_TOP_LEVEL_DOMAINS = [
  'local',
  'localhost',
  'localdomain',
  'internal',
  'intranet',
  'private',
  'corp',
  'lan',
  'home.arpa',
  'test',
  'example',
  'invalid',
];
const COUNTRY_SECOND_LEVEL_DOMAINS = [
  'co',
  'com',
  'net',
  'org',
  'gov',
  'edu',
  'ac',
];
const IPV4_ADDRESS = /^\d{1,3}(\.\d{1,3}){3}$/;

interface Domain {
  name: string;
  suffix: string;
}

const typosToleratedIn = (name: string) =>
  name.length < 4 ? 0 : name.length < 10 ? 1 : 2;

function closestWithinTolerance(
  candidate: string,
  targets: readonly string[]
): string | undefined {
  let closest: { target: string; edits: number } | undefined;
  for (const target of targets) {
    const edits = damerauLevenshteinDistance(candidate, target);
    const tolerated = edits <= typosToleratedIn(target);
    if (tolerated && (!closest || edits < closest.edits)) {
      closest = { target, edits };
    }
  }
  return closest?.target;
}

const isNear = (candidate: string, target: string) =>
  closestWithinTolerance(candidate, [target]) !== undefined;

function isInternalHost(host: string) {
  return (
    host.startsWith('[') ||
    IPV4_ADDRESS.test(host) ||
    !host.includes('.') ||
    INTERNAL_TOP_LEVEL_DOMAINS.some(
      topLevel => host === topLevel || host.endsWith(`.${topLevel}`)
    )
  );
}

function registrableDomain(host: string): Domain {
  const labels = host.split('.');
  const [secondLevel, topLevel] = labels.slice(-2);
  const hasCountrySecondLevel =
    labels.length > 2 &&
    topLevel.length === 2 &&
    COUNTRY_SECOND_LEVEL_DOMAINS.includes(secondLevel);
  const suffixLabels = hasCountrySecondLevel ? 2 : 1;
  return {
    name: labels[labels.length - 1 - suffixLabels],
    suffix: labels.slice(-suffixLabels).join('.'),
  };
}

const formatDomain = ({ name, suffix }: Domain) => `${name}.${suffix}`;
const withoutPunctuation = (text: string) => text.replace(/[.-]/g, '');

function imitatesDomain(candidate: Domain, target: Domain) {
  const typoInName =
    candidate.suffix === target.suffix && isNear(candidate.name, target.name);
  const sameNameOtherEnding = candidate.name === target.name;
  const punctuationMoved =
    withoutPunctuation(candidate.name) ===
    withoutPunctuation(formatDomain(target));
  return typoInName || sameNameOtherEnding || punctuationMoved;
}

function imitatesRegistry(candidate: Domain, registry: KnownRegistry) {
  return (
    registry.domains.some(domain =>
      imitatesDomain(candidate, registrableDomain(domain))
    ) || (registry.aliases ?? []).some(alias => isNear(candidate.name, alias))
  );
}

function checkHost(host: string): RegistryCheck {
  if (isInternalHost(host)) {
    return { kind: 'internal-registry', registry: host };
  }

  const domain = registrableDomain(host);
  const isKnown = KNOWN_REGISTRIES.some(registry =>
    registry.domains.includes(formatDomain(domain))
  );
  if (isKnown) {
    return { kind: 'known-registry', registry: host };
  }

  const resembled = KNOWN_REGISTRIES.find(registry =>
    imitatesRegistry(domain, registry)
  );
  return resembled
    ? { kind: 'lookalike-registry', registry: host, resembles: resembled }
    : { kind: 'unknown-registry', registry: host };
}

function checkDockerHubPath(path: string): ImageSourceCheck {
  const fromDockerHub = {
    kind: 'known-registry',
    registry: DOCKER_HUB,
  } as const;
  const components = path.split('/');
  if (components.length !== 2) {
    return fromDockerHub;
  }

  const [namespace, name] = components;
  if (namespace !== OFFICIAL_NAMESPACE) {
    return isNear(namespace, OFFICIAL_NAMESPACE)
      ? { kind: 'lookalike-image', image: path, resembles: name }
      : fromDockerHub;
  }
  if (OFFICIAL_IMAGES.includes(name)) {
    return fromDockerHub;
  }

  const resembled = closestWithinTolerance(name, POPULAR_OFFICIAL_IMAGES);
  return resembled
    ? { kind: 'lookalike-image', image: name, resembles: resembled }
    : fromDockerHub;
}

export function checkRegistry(registry: string): RegistryCheck {
  const host = parseRegistryHost(registry);
  return host ? checkHost(host) : { kind: 'invalid' };
}

export function checkImageReference(reference: string): ImageSourceCheck {
  const parsed = parseImageReference(reference);
  if (!parsed) {
    return { kind: 'invalid' };
  }
  return parsed.registry === DOCKER_HUB
    ? checkDockerHubPath(parsed.path)
    : checkRegistry(parsed.registry);
}

export const needsConfirmation = (check: ImageSourceCheck) =>
  check.kind === 'lookalike-registry' || check.kind === 'lookalike-image';
