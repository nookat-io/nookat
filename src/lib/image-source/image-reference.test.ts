import { describe, expect, it } from 'vitest';
import {
  DOCKER_HUB,
  normalizeRegistry,
  parseImageReference,
  parseRegistryHost,
} from './image-reference';

const DIGEST =
  'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('parseImageReference', () => {
  it.each([
    ['ubuntu', { registry: DOCKER_HUB, path: 'library/ubuntu' }],
    [
      'ubuntu:24.04',
      { registry: DOCKER_HUB, path: 'library/ubuntu', tag: '24.04' },
    ],
    ['bitnami/redis', { registry: DOCKER_HUB, path: 'bitnami/redis' }],
    ['docker.io/ubuntu', { registry: DOCKER_HUB, path: 'library/ubuntu' }],
    [
      'index.docker.io/ubuntu',
      { registry: DOCKER_HUB, path: 'library/ubuntu' },
    ],
    [
      'docker.io/library/ubuntu:latest',
      { registry: DOCKER_HUB, path: 'library/ubuntu', tag: 'latest' },
    ],
    ['ghcr.io/org/app', { registry: 'ghcr.io', path: 'org/app' }],
    [
      'localhost:5000/app:1.0',
      { registry: 'localhost:5000', path: 'app', tag: '1.0' },
    ],
    ['localhost/app', { registry: 'localhost', path: 'app' }],
    [
      'myregistry.local:5000/team/app',
      { registry: 'myregistry.local:5000', path: 'team/app' },
    ],
    ['Registry/app', { registry: 'Registry', path: 'app' }],
    ['[::1]:5000/app', { registry: '[::1]:5000', path: 'app' }],
    [
      'us-docker.pkg.dev/project/repo/image',
      { registry: 'us-docker.pkg.dev', path: 'project/repo/image' },
    ],
    [
      `nginx@${DIGEST}`,
      { registry: DOCKER_HUB, path: 'library/nginx', digest: DIGEST },
    ],
    [
      `quay.io/org/app:v1@${DIGEST}`,
      { registry: 'quay.io', path: 'org/app', tag: 'v1', digest: DIGEST },
    ],
  ])('reads %s the way Docker does', (text, expected) => {
    expect(parseImageReference(text)).toEqual(expected);
  });

  it('reads a host and port with no path as an image and tag, as Docker does', () => {
    expect(parseImageReference('localhost:5000')).toEqual({
      registry: DOCKER_HUB,
      path: 'library/localhost',
      tag: '5000',
    });
  });

  it.each([
    '',
    ' ubuntu',
    'Ubuntu',
    'org/App',
    'ghcr.io/',
    'ghcr.io//app',
    'app:',
    'app:-tag',
    `app:${'t'.repeat(129)}`,
    'app@sha256:short',
    '-registry.io/app',
    'registry.io:port/app',
    'https://ghcr.io/org/app',
    'org/app/',
    'my..app',
  ])('rejects %j', text => {
    expect(parseImageReference(text)).toBeNull();
  });
});

describe('parseRegistryHost', () => {
  it.each([
    ['ghcr.io', 'ghcr.io'],
    ['GHCR.IO', 'ghcr.io'],
    ['localhost:5000', 'localhost'],
    ['registry:5000', 'registry'],
    ['10.0.0.5:5000', '10.0.0.5'],
    ['[fd00::1]:5000', '[fd00::1]'],
    ['index.docker.io', 'index.docker.io'],
  ])('reads the host of %s as %s', (text, host) => {
    expect(parseRegistryHost(text)).toBe(host);
  });

  it.each([
    '',
    'ghcr.',
    '-ghcr.io',
    'ghcr.io/',
    'ghcr .io',
    'host:',
    'host:abc',
  ])('rejects %j', text => {
    expect(parseRegistryHost(text)).toBeNull();
  });
});

describe('normalizeRegistry', () => {
  it.each([
    ['https://ghcr.io', 'ghcr.io'],
    ['ghcr.io/', 'ghcr.io'],
    [' HTTPS://ghcr.io// ', 'ghcr.io'],
    ['http://ghcr.io', 'ghcr.io'],
    ['http://localhost:5000/', 'localhost:5000'],
    ['index.docker.io', 'docker.io'],
    ['docker.io/', 'docker.io'],
    ['index.docker.io/team', 'docker.io/team'],
    ['ghcr.io/myorg/', 'ghcr.io/myorg'],
    ['Registry', 'Registry'],
  ])('turns %j into %j', (registry, normalized) => {
    expect(normalizeRegistry(registry)).toBe(normalized);
  });
});
