import { ContainerData } from './container-data-provider';

interface ContainerFilterLogicProps {
  containers: ContainerData[];
  filter: 'all' | 'running' | 'stopped';
  searchTerm: string;
  children: (filteredContainers: ContainerData[]) => React.ReactNode;
}

export function ContainerFilterLogic({
  containers,
  filter,
  searchTerm,
  children,
}: ContainerFilterLogicProps) {
  const filteredContainers = containers.filter(container => {
    const containerName =
      container.names.length > 0 ? container.names[0].replace(/^\//, '') : '';
    const imageName =
      container.image && container.image.includes('@')
        ? container.image.split('@')[0]
        : container.image;

    const matchesSearch =
      containerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imageName.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === 'running')
      return matchesSearch && container.state === 'running';
    if (filter === 'stopped')
      return matchesSearch && container.state !== 'running';
    return matchesSearch;
  });

  return <>{children(filteredContainers)}</>;
}
