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
  onActionComplete?: () => void;
}

export function ContainerGroupActions({
  containerIds,
  hasRunningContainers,
  allStopped,
  onActionComplete,
}: ContainerGroupActionsProps) {
  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch {
      // Error handling is done in the service
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Group actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Start action for stopped groups */}
        {allStopped && (
          <DropdownMenuItem
            onClick={() =>
              handleAction(() =>
                ContainerActionService.bulkStartContainers(containerIds, {
                  onActionComplete,
                })
              )
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Start
          </DropdownMenuItem>
        )}

        {/* Stop action for groups with running containers */}
        {hasRunningContainers && (
          <DropdownMenuItem
            onClick={() =>
              handleAction(() =>
                ContainerActionService.bulkStopContainers(containerIds, {
                  onActionComplete,
                })
              )
            }
          >
            <Square className="mr-2 h-4 w-4" />
            Stop
          </DropdownMenuItem>
        )}

        {/* Delete action for all groups */}
        <DropdownMenuItem
          className="text-destructive"
          onClick={() =>
            handleAction(() =>
              ContainerActionService.bulkDeleteContainers(
                containerIds,
                hasRunningContainers,
                { onActionComplete }
              )
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
