import { Container } from './container-types';

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
  const groupedContainers: Record<string, Container[]> = {};

  containers.forEach(container => {
    const projectName = getProjectName(container);

    if (projectName) {
      // Container belongs to a compose project
      if (!groupedContainers[projectName]) {
        groupedContainers[projectName] = [];
      }
      groupedContainers[projectName].push(container);
    } else {
      // Individual container (not part of a compose project)
      individualContainers.push(container);
    }
  });

  // Sort containers by creation time (newest first)
  const sortByCreatedTime = (a: Container, b: Container) =>
    (b.created || 0) - (a.created || 0);

  const groups: ContainerGroup[] = Object.entries(groupedContainers).map(
    ([projectName, containers]) => ({
      projectName,
      containers: containers.sort(sortByCreatedTime),
      isExpanded: expandedGroups.has(projectName),
    })
  );

  // Sort groups by the creation time of their newest container
  const sortedGroups = groups.sort((a, b) => {
    const newestA = Math.max(...a.containers.map(c => c.created || 0));
    const newestB = Math.max(...b.containers.map(c => c.created || 0));
    return newestB - newestA;
  });

  return {
    individualContainers: individualContainers.sort(sortByCreatedTime),
    groupedContainers: sortedGroups,
  };
};

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
