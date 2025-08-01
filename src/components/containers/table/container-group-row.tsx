'use client';

import { TableCell, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ContainerData } from '../data/container-data-provider';
import { ContainerGroupActions } from '../actions/container-group-actions';
import { ContainerRow } from './container-row';

interface ContainerGroupRowProps {
  projectName: string;
  containers: ContainerData[];
  isExpanded: boolean;
  filter: 'all' | 'running' | 'stopped';
  selectedContainers: string[];
  onToggleGroup: (projectName: string) => void;
  onSelectionChange: (containerId: string, checked: boolean) => void;
  onActionComplete?: () => void;
  onOpenLogs: (container: ContainerData) => void;
}

export function ContainerGroupRow({
  projectName,
  containers,
  isExpanded,
  filter,
  selectedContainers,
  onToggleGroup,
  onSelectionChange,
  onActionComplete,
  onOpenLogs,
}: ContainerGroupRowProps) {
  const filteredGroupContainers = containers.filter(container => {
    if (filter === 'running') return container.state === 'running';
    if (filter === 'stopped') return container.state !== 'running';
    return true;
  });

  if (filteredGroupContainers.length === 0) return null;

  const hasRunningContainers = containers.some(c => c.state === 'running');
  const allStopped = containers.every(c => c.state !== 'running');
  const groupContainerIds = containers.map(c => c.id);

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
            <Badge variant="outline" className="text-xs">
              {filteredGroupContainers.length} containers
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          Docker Compose Project
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            {containers.some(c => c.state === 'running') && (
              <Badge
                variant="default"
                className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              >
                Running
              </Badge>
            )}
            {containers.every(c => c.state !== 'running') && (
              <Badge variant="secondary" className="text-xs">
                Stopped
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
        filteredGroupContainers.map(container => (
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
