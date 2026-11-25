import { describe, expect, it } from 'vitest';
import { volumeFilter } from './volume-filter';
import { Volume } from './volume-types';

const volumes = [
  { name: 'mounted', in_use: true },
  { name: 'orphan', in_use: false },
] as Volume[];

const namesMatching = (filter: 'used' | 'unused') =>
  volumes.filter(volumeFilter.matches[filter]).map(volume => volume.name);

describe('volumeFilter', () => {
  it('splits volumes by whether a container references them', () => {
    expect(namesMatching('used')).toEqual(['mounted']);
    expect(namesMatching('unused')).toEqual(['orphan']);
  });
});
