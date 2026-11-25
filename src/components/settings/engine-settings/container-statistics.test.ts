import { describe, expect, it } from 'vitest';
import { containerStatistics } from './container-statistics';
import { Container, ContainerState } from '../../containers/container-types';
import { Image } from '../../images/image-types';
import { EngineState } from '../../../types/engine-state';

const snapshot = (containers: Container[], images: Image[]): EngineState => ({
  containers: Object.fromEntries(containers.map(c => [c.id, c])),
  images: Object.fromEntries(images.map(i => [i.id, i])),
  volumes: {},
  networks: {},
  engine_status: { Running: 'Docker' },
  version: 1,
  last_updated: '2026-11-25T00:00:00Z',
});

const image = (id: string, imageId: string): Image => ({
  id,
  image_id: imageId,
  created: 0,
  size: 0,
  in_use: false,
  dangling: false,
});

describe('containerStatistics', () => {
  it('counts every container state in the bucket docker info uses', () => {
    const containers: Container[] = [
      ...Object.values(ContainerState).map(state => ({
        id: `container-${state || 'empty'}`,
        state,
      })),
      { id: 'container-without-state' },
    ];

    const statistics = containerStatistics(snapshot(containers, []));

    expect(statistics).toEqual({
      running: 1,
      paused: 1,
      stopped: 8,
      images: 0,
    });
  });

  it('counts images by image id', () => {
    const images = [
      image('nginx:latest', 'sha256:aaa'),
      image('nginx:1.27', 'sha256:aaa'),
      image('alpine:latest', 'sha256:bbb'),
    ];

    expect(containerStatistics(snapshot([], images)).images).toBe(2);
  });
});
