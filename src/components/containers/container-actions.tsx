import { Button } from '../ui/button';
import { Play, Square, RotateCcw, Trash2, Plus, Pause, Play as ResumeIcon, Scissors } from 'lucide-react';
import { ContainerData } from './container-data-provider';
import { invoke } from '@tauri-apps/api/core';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ContainerActionsProps {
  selectedContainers: string[];
  containers: ContainerData[];
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

interface BulkOperationResult {
  successful: string[];
  failed: Array<{ container_id: string; error: string }>;
  total: number;
  success_count: number;
  failure_count: number;
}

export function ContainerActions({ selectedContainers, containers, onActionComplete, onSelectionChange }: ContainerActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const selectedContainerData = containers.filter(container => 
    selectedContainers.includes(container.id)
  );

  const canStart = selectedContainerData.length > 0 && selectedContainerData.every(container => 
    ['stopped', 'exited', 'created'].includes(container.state)
  );

  const canStop = selectedContainerData.length > 0 && selectedContainerData.every(container => 
    ['running', 'restarting'].includes(container.state)
  );

  const canPause = selectedContainerData.length > 0 && selectedContainerData.every(container => 
    container.state === 'running'
  );

  const canResume = selectedContainerData.length > 0 && selectedContainerData.every(container => 
    container.state === 'paused'
  );

  const canRestart = selectedContainerData.length > 0 && selectedContainerData.every(container => 
    ['running', 'restarting'].includes(container.state)
  );

  const canDelete = selectedContainerData.length > 0 && selectedContainerData.every(container => 
    ['stopped', 'exited', 'created', "running"].includes(container.state)
  );

  const handleBulkOperationResult = useCallback((result: BulkOperationResult, actionName: string) => {
    if (result.success_count === result.total) {
      // All successful
      toast.success(`Successfully ${actionName}ed ${result.success_count} container${result.success_count > 1 ? 's' : ''}`);
    } else if (result.success_count > 0) {
      // Partial success
      toast.warning(
        `${actionName}ed ${result.success_count}/${result.total} containers. ${result.failure_count} failed.`,
        {
          description: result.failed.slice(0, 3).map(f => f.error).join(', ') + 
            (result.failed.length > 3 ? '...' : ''),
        }
      );
    } else {
      // Complete failure
      toast.error(`Failed to ${actionName} any containers`, {
        description: result.failed.slice(0, 3).map(f => f.error).join(', ') + 
          (result.failed.length > 3 ? '...' : ''),
      });
    }
  }, []);

  const handleAction = useCallback(async (action: string, containerIds: string[]) => {
    // Validate container IDs exist
    const existingContainerIds = containerIds.filter(id => 
      containers.some(container => container.id === id)
    );
    
    if (existingContainerIds.length === 0) {
      toast.error('No valid containers selected');
      return;
    }
    
    // Prevent concurrent operations
    if (isLoading) {
      toast.warning('Another operation is in progress. Please wait.');
      return;
    }
    
    setIsLoading(action);
    
    try {
      if (existingContainerIds.length === 1) {
        // Single container operation
        await invoke(action, { id: existingContainerIds[0] });
        
        const actionName = action.replace('_container', '').replace('unpause', 'resume');
        toast.success(`${actionName.charAt(0).toUpperCase() + actionName.slice(1)}ed container`);
      } else {
        // Bulk operation - map singular to plural for bulk commands
        const bulkActionMap: Record<string, string> = {
          'start_container': 'bulk_start_containers',
          'stop_container': 'bulk_stop_containers',
          'pause_container': 'bulk_pause_containers',
          'unpause_container': 'bulk_unpause_containers',
          'restart_container': 'bulk_restart_containers',
          'remove_container': 'bulk_remove_containers'
        };
        
        const bulkAction = bulkActionMap[action];
        if (!bulkAction) {
          throw new Error(`Unknown bulk action: ${action}`);
        }
        
        const result = await invoke<BulkOperationResult>(bulkAction, { ids: existingContainerIds });
        const actionName = action.replace('_container', '').replace('unpause', 'resume');
        handleBulkOperationResult(result, actionName);
      }
      
      // Clear selections for destructive actions
      if (action === 'remove_container') {
        onSelectionChange?.([]);
      }
      
    } catch (error) {
      console.error(`Error ${action}ing container:`, error);
      const actionName = action.replace('_container', '').replace('unpause', 'resume');
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to ${actionName} container: ${errorMessage}`);
    } finally {
      setIsLoading(null);
      
      // Refresh container list after operation
      if (onActionComplete) {
        // Use a more reliable delay
        setTimeout(onActionComplete, 1000);
      }
    }
  }, [containers, isLoading, onActionComplete, onSelectionChange, handleBulkOperationResult]);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction('start_container', selectedContainers)}
        disabled={!canStart || isLoading === 'start_container'}
        className="flex items-center gap-1"
      >
        {isLoading === 'start_container' ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Play className="h-3 w-3" />
        )}
        Start
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction('stop_container', selectedContainers)}
        disabled={!canStop || isLoading === 'stop_container'}
        className="flex items-center gap-1"
      >
        {isLoading === 'stop_container' ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Square className="h-3 w-3" />
        )}
        Stop
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction('pause_container', selectedContainers)}
        disabled={!canPause || isLoading === 'pause_container'}
        className="flex items-center gap-1"
      >
        {isLoading === 'pause_container' ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Pause className="h-3 w-3" />
        )}
        Pause
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction('unpause_container', selectedContainers)}
        disabled={!canResume || isLoading === 'unpause_container'}
        className="flex items-center gap-1"
      >
        {isLoading === 'unpause_container' ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <ResumeIcon className="h-3 w-3" />
        )}
        Resume
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction('restart_container', selectedContainers)}
        disabled={!canRestart || isLoading === 'restart_container'}
        className="flex items-center gap-1"
      >
        {isLoading === 'restart_container' ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <RotateCcw className="h-3 w-3" />
        )}
        Restart
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction('remove_container', selectedContainers)}
        disabled={!canDelete || isLoading === 'remove_container'}
        className="flex items-center gap-1"
      >
        {isLoading === 'remove_container' ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
        Remove
      </Button>
    </div>
  );
}