import { TableCell, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Container, ContainerState } from './container-types';
import { ContainerGroupActions } from './container-group-actions';
import { ContainerRow } from './container-row';

interface ContainerGroupRowProps {
  projectName: string;
  containers: Container[];
  isExpanded: boolean;
  selectedContainers: string[];
  onToggleGroup: (projectName: string) => void;
  onSelectionChange: (containerId: string, checked: boolean) => void;
  onActionComplete?: () => void;
  onOpenLogs: (container: Container) => void;
}

export function ContainerGroupRow({
  projectName,
  containers,
  isExpanded,
  selectedContainers,
  onToggleGroup,
  onSelectionChange,
  onActionComplete,
  onOpenLogs,
}: ContainerGroupRowProps) {
  const hasRunningContainers = containers.some(
    c => c.state === ContainerState.Running
  );
  const allStopped = containers.every(c => c.state !== ContainerState.Running);
  const groupContainerIds = containers.map(c => c.id);

  if (containers.length === 0) return null;

  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleGroup(projectName)}
            className="p-0 h-auto"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-semibold">
          <div className="flex items-center gap-2">
            <span>{projectName}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {containers.length} containers
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            {containers.some(c => c.state === 'running') && (
              <Badge
                variant="default"
                className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              >
                running
              </Badge>
            )}
            {containers.every(c => c.state !== 'running') && (
              <Badge variant="secondary" className="text-xs">
                exited
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">-</TableCell>
        <TableCell className="text-muted-foreground">-</TableCell>
        <TableCell className="text-left">
          <ContainerGroupActions
            containerIds={groupContainerIds}
            hasRunningContainers={hasRunningContainers}
            allStopped={allStopped}
            onActionComplete={onActionComplete}
          />
        </TableCell>
      </TableRow>

      {/* Render nested containers when expanded */}
      {isExpanded &&
        containers.map(container => (
          <ContainerRow
            key={container.id}
            container={container}
            isNested={true}
            isSelected={selectedContainers.includes(container.id)}
            onSelectionChange={onSelectionChange}
            onActionComplete={onActionComplete}
            onOpenLogs={onOpenLogs}
          />
        ))}
    </>
  );
}
