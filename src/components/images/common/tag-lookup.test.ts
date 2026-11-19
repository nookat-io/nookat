import { describe, expect, it, vi } from 'vitest';
import { DockerHubTag } from '../../../types/docker-images';
import { createTagLookup } from './tag-lookup';

const LATEST: DockerHubTag = {
  name: 'latest',
  size: 1024,
  last_pushed: null,
  platforms: ['linux/amd64'],
};

describe('createTagLookup', () => {
  it('asks Docker Hub once for each image and tag', async () => {
    const fetchTag = vi.fn(async (_imageName: string, tag: string) =>
      tag === 'latest' ? LATEST : null
    );
    const lookupTag = createTagLookup(fetchTag);

    expect(await lookupTag('nginx', 'latest')).toEqual(LATEST);
    expect(await lookupTag('nginx', 'latest')).toEqual(LATEST);
    expect(await lookupTag('nginx', 'missing')).toBeNull();
    expect(await lookupTag('redis', 'latest')).toEqual(LATEST);

    expect(fetchTag.mock.calls).toEqual([
      ['nginx', 'latest'],
      ['nginx', 'missing'],
      ['redis', 'latest'],
    ]);
  });

  it('asks again after a lookup failed', async () => {
    const fetchTag = vi
      .fn<(imageName: string, tag: string) => Promise<DockerHubTag | null>>()
      .mockRejectedValueOnce('Docker Hub is unreachable')
      .mockResolvedValueOnce(LATEST);
    const lookupTag = createTagLookup(fetchTag);

    await expect(lookupTag('nginx', 'latest')).rejects.toBe(
      'Docker Hub is unreachable'
    );
    expect(await lookupTag('nginx', 'latest')).toEqual(LATEST);
    expect(fetchTag).toHaveBeenCalledTimes(2);
  });
});
