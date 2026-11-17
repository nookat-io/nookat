import { describe, expect, it } from 'vitest';
import { containerFilter } from './container-filter';
import { Container, ContainerState } from './container-types';

const containers = [
  { id: 'up', state: ContainerState.Running },
  { id: 'exited', state: ContainerState.Exited },
  { id: 'paused', state: ContainerState.Paused },
  { id: 'unknown' },
] as Container[];

const idsMatching = (filter: 'running' | 'stopped') =>
  containers
    .filter(containerFilter.matches[filter])
    .map(container => container.id);

describe('containerFilter', () => {
  it('splits containers into running and everything else', () => {
    expect(idsMatching('running')).toEqual(['up']);
    expect(idsMatching('stopped')).toEqual(['exited', 'paused', 'unknown']);
  });
});
