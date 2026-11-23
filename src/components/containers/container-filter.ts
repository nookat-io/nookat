import { FilterConfig } from '../../utils/use-filter';
import { Container, ContainerState } from './container-types';

export type ContainerFilter = 'all' | 'running' | 'stopped';

export const containerFilterPhrases: Record<ContainerFilter, string> = {
  all: 'containers',
  running: 'running containers',
  stopped: 'stopped containers',
};

const isRunning = (container: Container) =>
  container.state === ContainerState.Running;

export const containerFilter: FilterConfig<Container, ContainerFilter> = {
  searchFields: ['names', 'image'],
  matches: {
    running: isRunning,
    stopped: container => !isRunning(container),
  },
};
