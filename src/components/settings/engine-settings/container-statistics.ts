import { ContainerState } from '../../containers/container-types';
import { EngineState } from '../../../types/engine-state';

export interface ContainerStatisticsCounts {
  running: number;
  paused: number;
  stopped: number;
  images: number;
}

export function containerStatistics(
  engineState: EngineState
): ContainerStatisticsCounts {
  const containers = Object.values(engineState.containers);
  const running = containers.filter(
    container => container.state === ContainerState.Running
  ).length;
  const paused = containers.filter(
    container => container.state === ContainerState.Paused
  ).length;
  const imageIds = new Set(
    Object.values(engineState.images).map(image => image.image_id)
  );

  return {
    running,
    paused,
    stopped: containers.length - running - paused,
    images: imageIds.size,
  };
}
