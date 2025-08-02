'use client';

import { TableCell, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { ContainerData } from './container-types';
import { PortMappings } from './port-mappings';
import { ContainerStatusBadge } from './container-status-badge';
import { ContainerRowActions } from './container-row-actions';
import { formatContainerName, formatContainerImage } from './container-utils';

interface ContainerRowProps {
  container: ContainerData;
  isNested?: boolean;
  isSelected: boolean;
  onSelectionChange: (containerId: string, checked: boolean) => void;
  onActionComplete?: () => void;
  onOpenLogs: (container: ContainerData) => void;
}

export function ContainerRow({
  container,
  isNested = false,
  isSelected,
  onSelectionChange,
  onActionComplete,
  onOpenLogs,
}: ContainerRowProps) {
  return (
    <TableRow className={isNested ? 'bg-muted/50' : ''}>
      <TableCell className={isNested ? 'pl-8' : ''}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={checked =>
            onSelectionChange(container.id, checked as boolean)
          }
        />
      </TableCell>
      <TableCell className={`font-medium ${isNested ? 'pl-8' : ''}`}>
        {formatContainerName(container)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatContainerImage(container.image)}
      </TableCell>
      <TableCell>
        <ContainerStatusBadge state={container.state} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(new Date(container.created * 1000))} ago
      </TableCell>
      <TableCell className="text-muted-foreground">
        <PortMappings ports={container.ports} />
      </TableCell>
      <TableCell className="text-left">
        <ContainerRowActions
          container={container}
          onActionComplete={onActionComplete}
          onOpenLogs={onOpenLogs}
        />
      </TableCell>
    </TableRow>
  );
}
