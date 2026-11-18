import { Button } from '../ui/button';
import { MoreHorizontal, Play, Square, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ContainerActionService } from './container-actions-service';

interface ContainerGroupActionsProps {
  containerIds: string[];
  hasRunningContainers: boolean;
  allStopped: boolean;
}

export function ContainerGroupActions({
  containerIds,
  hasRunningContainers,
  allStopped,
}: ContainerGroupActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Group actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {allStopped && (
          <DropdownMenuItem
            onClick={() =>
              ContainerActionService.bulkStartContainers(containerIds)
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Start
          </DropdownMenuItem>
        )}

        {hasRunningContainers && (
          <DropdownMenuItem
            onClick={() =>
              ContainerActionService.bulkStopContainers(containerIds)
            }
          >
            <Square className="mr-2 h-4 w-4" />
            Stop
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className="text-destructive"
          onClick={() =>
            ContainerActionService.bulkDeleteContainers(
              containerIds,
              hasRunningContainers
            )
          }
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {hasRunningContainers ? 'Force Delete' : 'Delete'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
