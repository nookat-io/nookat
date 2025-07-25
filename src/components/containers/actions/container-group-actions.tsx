'use client';

import { Button } from '../../ui/button';
import { Play, Square, Trash2 } from 'lucide-react';
import { ContainerActionService } from '../utils/container-actions';

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
  onActionComplete 
}: ContainerGroupActionsProps) {
  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch {
      // Error handling is done in the service
    }
  };

  return (
    <div className="flex gap-1">
      {/* Start action for stopped groups */}
      {allStopped && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction(() => 
            ContainerActionService.bulkStartContainers(containerIds, { onActionComplete })
          )}
          className="h-7 px-2 text-xs"
        >
          <Play className="mr-1 h-3 w-3" />
          Start
        </Button>
      )}
      
      {/* Stop action for groups with running containers */}
      {hasRunningContainers && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction(() => 
            ContainerActionService.bulkStopContainers(containerIds, { onActionComplete })
          )}
          className="h-7 px-2 text-xs"
        >
          <Square className="mr-1 h-3 w-3" />
          Stop
        </Button>
      )}
      
      {/* Delete action for all groups */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAction(() => 
          ContainerActionService.bulkDeleteContainers(
            containerIds, 
            hasRunningContainers, 
            { onActionComplete }
          )
        )}
        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
      >
        <Trash2 className="mr-1 h-3 w-3" />
        Delete
      </Button>
    </div>
  );
} 