import { describe, expect, it } from 'vitest';
import { isValidTag, pullReference } from './utils';

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
