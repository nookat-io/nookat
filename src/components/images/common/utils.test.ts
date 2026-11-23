import { describe, expect, it } from 'vitest';
import { isValidTag, pullReference, pullReferenceProblem } from './utils';

describe('isValidTag', () => {
  it.each([
    'latest',
    '13.5.0-runtime-ubuntu24.04',
    '_internal',
    'V2',
    'a'.repeat(128),
  ])('accepts %s', tag => {
    expect(isValidTag(tag)).toBe(true);
  });

  it.each([
    '',
    '.hidden',
    '-rc1',
    'two words',
    'nginx:latest',
    'library/nginx',
    'a'.repeat(129),
  ])('rejects %j', tag => {
    expect(isValidTag(tag)).toBe(false);
  });
});

describe('pullReference', () => {
  it('names the tag only once one is chosen', () => {
    expect(
      pullReference({ imageName: 'nginx', tag: '', registry: 'docker.io' })
    ).toBe('nginx');
    expect(
      pullReference({ imageName: 'nginx', tag: '1.27', registry: 'ghcr.io' })
    ).toBe('ghcr.io/nginx:1.27');
  });
});

describe('pullReferenceProblem', () => {
  const nginxFrom = (registry: string) => ({
    imageName: 'nginx',
    tag: 'latest',
    registry,
  });

  it('pulls a registry pasted with a scheme and a trailing slash from its host', () => {
    expect(pullReferenceProblem(nginxFrom('https://ghcr.io/'))).toBeNull();
    expect(pullReference(nginxFrom('https://ghcr.io/'))).toBe(
      'ghcr.io/nginx:latest'
    );
  });

  it.each(['docker.io', 'localhost:5000', 'ghcr.io/myorg', 'Registry'])(
    'finds no problem with %s',
    registry => {
      expect(pullReferenceProblem(nginxFrom(registry))).toBeNull();
    }
  );

  it('refuses a registry Docker would read as a Docker Hub namespace', () => {
    expect(pullReferenceProblem(nginxFrom('myregistry'))).toBe(
      'myregistry is not a registry address, so Docker would pull from Docker Hub. Add its domain or port, such as myregistry:5000'
    );
  });

  it('refuses a reference Docker cannot parse', () => {
    expect(pullReferenceProblem(nginxFrom('ghcr.io:abc'))).toBe(
      'ghcr.io:abc/nginx:latest is not a valid image reference'
    );
  });
});
