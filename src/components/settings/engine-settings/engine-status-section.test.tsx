import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EngineStatusSection } from './engine-status-section';
import { Container, ContainerState } from '../../containers/container-types';
import { Image } from '../../images/image-types';
import { EngineState } from '../../../types/engine-state';
import { DockerInfo } from '../../../types/docker-info';

const EMPTY_DOCKER_INFO: DockerInfo = {
  containers_running: 0,
  containers_paused: 0,
  containers_stopped: 0,
  images: 0,
};

const container = (id: string, state: ContainerState): Container => ({
  id,
  state,
});

const image = (id: string): Image => ({
  id,
  image_id: `sha256:${id}`,
  created: 0,
  size: 0,
  in_use: false,
  dangling: false,
});

const snapshot = (containers: Container[], images: Image[]): EngineState => ({
  containers: Object.fromEntries(containers.map(c => [c.id, c])),
  images: Object.fromEntries(images.map(i => [i.id, i])),
  volumes: {},
  networks: {},
  engine_status: { Running: 'Docker' },
  version: 1,
  last_updated: '2026-11-25T00:00:00Z',
});

const THREE_IMAGES = [image('nginx'), image('alpine'), image('redis')];

const statValue = (label: string) =>
  screen.getByText(label).previousElementSibling?.textContent;

const expectCounts = (counts: {
  running: number;
  paused: number;
  stopped: number;
  images: number;
}) => {
  expect(statValue('Running')).toBe(String(counts.running));
  expect(statValue('Paused')).toBe(String(counts.paused));
  expect(statValue('Stopped')).toBe(String(counts.stopped));
  expect(statValue('Images')).toBe(String(counts.images));
};

describe('EngineStatusSection', () => {
  it('shows the counts of the engine snapshot instead of the docker info numbers', () => {
    const engineState = snapshot(
      [
        container('web', ContainerState.Running),
        container('db', ContainerState.Running),
        container('worker', ContainerState.Paused),
        container('job', ContainerState.Exited),
      ],
      THREE_IMAGES
    );

    render(
      <EngineStatusSection
        dockerInfo={EMPTY_DOCKER_INFO}
        engineState={engineState}
      />
    );

    expectCounts({ running: 2, paused: 1, stopped: 1, images: 3 });
  });

  it('follows a newer snapshot', () => {
    const { rerender } = render(
      <EngineStatusSection
        dockerInfo={EMPTY_DOCKER_INFO}
        engineState={snapshot(
          [
            container('web', ContainerState.Running),
            container('db', ContainerState.Running),
            container('worker', ContainerState.Paused),
            container('job', ContainerState.Exited),
          ],
          THREE_IMAGES
        )}
      />
    );

    rerender(
      <EngineStatusSection
        dockerInfo={EMPTY_DOCKER_INFO}
        engineState={snapshot(
          [
            container('web', ContainerState.Running),
            container('db', ContainerState.Exited),
            container('worker', ContainerState.Paused),
            container('job', ContainerState.Exited),
          ],
          THREE_IMAGES
        )}
      />
    );

    expectCounts({ running: 1, paused: 1, stopped: 2, images: 3 });
  });

  it('shows the docker info counts before the first snapshot', () => {
    render(
      <EngineStatusSection
        dockerInfo={{
          containers_running: 4,
          containers_paused: 2,
          containers_stopped: 7,
          images: 9,
        }}
        engineState={null}
      />
    );

    expectCounts({ running: 4, paused: 2, stopped: 7, images: 9 });
  });
});
