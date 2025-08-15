import { ContainerActions } from './container-actions';
import { Container } from './container-types';

interface ContainerHeaderProps {
  selectedContainers: string[];
  containers: Container[];
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

export function ContainerHeader({
  selectedContainers,
  containers,
  onActionComplete,
  onSelectionChange,
}: ContainerHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col items-start justify-start">
            <h1 className="text-3xl font-bold bg-clip-text">Containers</h1>
            <p className="text-muted-foreground mt-2">
              Manage your containers
              {containers.length > 0 &&
                ` - ${containers.length} container${containers.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div className="flex items-start">
            <ContainerActions
              selectedContainers={selectedContainers}
              containers={containers}
              onActionComplete={onActionComplete}
              onSelectionChange={onSelectionChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
