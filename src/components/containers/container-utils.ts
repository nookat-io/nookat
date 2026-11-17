import { Container, ContainerState } from './container-types';

export interface ContainerGroup {
  projectName: string;
  containers: Container[];
  isExpanded: boolean;
}

export const getProjectName = (container: Container): string | null => {
  return (
    (container.labels && container.labels['com.docker.compose.project']) || null
  );
};

export const organizeContainers = (
  containers: Container[],
  expandedGroups: Set<string>
) => {
  const individualContainers: Container[] = [];
  const containersByProject = new Map<string, Container[]>();

  containers.forEach(container => {
    const projectName = getProjectName(container);
    if (!projectName) {
      individualContainers.push(container);
      return;
    }
    const projectContainers = containersByProject.get(projectName) ?? [];
    projectContainers.push(container);
    containersByProject.set(projectName, projectContainers);
  });

  const groupedContainers: ContainerGroup[] = Array.from(
    containersByProject,
    ([projectName, projectContainers]) => ({
      projectName,
      containers: projectContainers,
      isExpanded: expandedGroups.has(projectName),
    })
  );

  return { individualContainers, groupedContainers };
};

const isInState = (container: Container, states: ContainerState[]) =>
  container.state !== undefined && states.includes(container.state);

export const canStartContainer = (container: Container) =>
  isInState(container, [ContainerState.Exited, ContainerState.Created]);

export const canStopContainer = (container: Container) =>
  isInState(container, [ContainerState.Running, ContainerState.Restarting]);

export const canRestartContainer = canStopContainer;

export const isContainerRunning = (container: Container) =>
  container.state === ContainerState.Running;

export const canPauseContainer = isContainerRunning;

export const canOpenContainerTerminal = isContainerRunning;

export const canResumeContainer = (container: Container) =>
  container.state === ContainerState.Paused;

export const canDeleteContainer = (container: Container) =>
  isInState(container, [
    ContainerState.Exited,
    ContainerState.Created,
    ContainerState.Running,
  ]);

export const formatContainerName = (container: Container): string => {
  if (container.names && container.names.length > 0) {
    let first_name = container.names[0];
    if (first_name.startsWith('/')) {
      first_name = first_name.slice(1);
    }
    return first_name;
  }
  return '';
};

export const formatContainerImage = (image: string): string => {
  if (image && image.includes('@')) {
    return image.split('@')[0];
  }
  return image;
};
