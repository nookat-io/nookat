import { describe, expect, it } from 'vitest';
import { Image } from '../../images/image-types';
import {
  localImageReference,
  normalizeImageReference,
  pullTarget,
} from './image-reference';

const image = (overrides: Partial<Image>): Image => ({
  id: 'sha256:abc',
  repository: 'nginx',
  tag: 'latest',
  image_id: 'sha256:abc',
  created: 0,
  size: 0,
  in_use: false,
  dangling: false,
  ...overrides,
});

describe('normalizeImageReference', () => {
  it('adds the latest tag when none is given', () => {
    expect(normalizeImageReference(' nginx ')).toBe('nginx:latest');
    expect(normalizeImageReference('bitnami/redis')).toBe(
      'bitnami/redis:latest'
    );
    expect(normalizeImageReference('localhost:5000/app')).toBe(
      'localhost:5000/app:latest'
    );
  });

  it('keeps an explicit tag or digest', () => {
    expect(normalizeImageReference('nginx:1.27')).toBe('nginx:1.27');
    expect(normalizeImageReference('ghcr.io/org/app:v2')).toBe(
      'ghcr.io/org/app:v2'
    );
    expect(normalizeImageReference('nginx@sha256:0123')).toBe(
      'nginx@sha256:0123'
    );
  });

  it('writes Docker Hub references the way Docker lists them locally', () => {
    expect(normalizeImageReference('docker.io/library/nginx:1.27')).toBe(
      'nginx:1.27'
    );
    expect(normalizeImageReference('library/nginx')).toBe('nginx:latest');
    expect(normalizeImageReference('docker.io/bitnami/redis:7')).toBe(
      'bitnami/redis:7'
    );
  });

  it('treats index.docker.io as Docker Hub', () => {
    expect(normalizeImageReference('index.docker.io/library/redis:7')).toBe(
      'redis:7'
    );
  });

  it('keeps a reference Docker would reject as it was typed', () => {
    expect(normalizeImageReference('My App ')).toBe('My App');
  });

  it('leaves an empty reference empty', () => {
    expect(normalizeImageReference('  ')).toBe('');
  });
});

describe('pullTarget', () => {
  it('pulls Docker Hub images from docker.io', () => {
    expect(pullTarget('nginx:1.27')).toEqual({
      imageName: 'nginx',
      tag: '1.27',
      registry: 'docker.io',
    });
    expect(pullTarget('bitnami/redis')).toEqual({
      imageName: 'bitnami/redis',
      tag: 'latest',
      registry: 'docker.io',
    });
  });

  it('pulls from the registry named in the reference', () => {
    expect(pullTarget('ghcr.io/org/app:v2')).toEqual({
      imageName: 'org/app',
      tag: 'v2',
      registry: 'ghcr.io',
    });
    expect(pullTarget('localhost:5000/app')).toEqual({
      imageName: 'app',
      tag: 'latest',
      registry: 'localhost:5000',
    });
  });

  it('cannot pull by digest or from an empty reference', () => {
    expect(pullTarget('nginx@sha256:0123')).toBeNull();
    expect(pullTarget('')).toBeNull();
  });

  it('cannot pull a reference Docker would reject', () => {
    expect(pullTarget('My App')).toBeNull();
    expect(pullTarget('nginx:bad/tag')).toBeNull();
  });
});

describe('localImageReference', () => {
  it('names a tagged image by repository and tag', () => {
    expect(localImageReference(image({}))).toBe('nginx:latest');
  });

  it('has no reference for a dangling or untagged image', () => {
    expect(localImageReference(image({ dangling: true, tag: null }))).toBe(
      null
    );
    expect(localImageReference(image({ tag: undefined }))).toBe(null);
  });
});
