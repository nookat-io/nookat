import { TableCell, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { Container } from './container-types';
import { PortMappings } from './port-mappings';
import { ContainerStatusBadge } from './container-status-badge';
import { ContainerRowActions } from './container-row-actions';
import { formatContainerName, formatContainerImage } from './container-utils';

interface ContainerRowProps {
  container: Container;
  isNested?: boolean;
  isSelected: boolean;
  onSelectionChange: (containerId: string, checked: boolean) => void;
  onActionComplete?: () => void;
  onOpenLogs: (container: Container) => void;
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
          onCheckedChange={checked => {
            const isChecked = checked === true;
            onSelectionChange(container.id, isChecked);
          }}
        />
      </TableCell>
      <TableCell className={`font-medium ${isNested ? 'pl-8' : ''}`}>
        <div className="truncate max-w-full">
          {formatContainerName(container)}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="truncate max-w-full">
          {container.image && formatContainerImage(container.image)}
        </div>
      </TableCell>
      <TableCell>
        {container.state && <ContainerStatusBadge state={container.state} />}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {container.created
          ? `${formatDistanceToNow(new Date(container.created * 1000))} ago`
          : ''}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {container.ports && <PortMappings ports={container.ports} />}
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
