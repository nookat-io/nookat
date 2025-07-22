import { ContainerActions } from './container-actions';
import { ContainerData } from './container-data-provider';

interface ContainerHeaderProps {
  selectedContainers: string[];
  containers: ContainerData[];
}

export function ContainerHeader({ selectedContainers, containers }: ContainerHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col items-start justify-start">
            <h1 className="text-3xl font-bold bg-clip-text">
              Containers
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your Docker containers
            </p>
          </div>
          <div className="flex items-start">
            <ContainerActions selectedContainers={selectedContainers} containers={containers} />
          </div>
        </div>
      </div>
    </div>
  );
} 