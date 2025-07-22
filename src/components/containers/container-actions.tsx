import { Button } from '../ui/button';
import { Play, Square, RotateCcw, Trash2, Plus, Pause, Play as ResumeIcon } from 'lucide-react';
import { ContainerData } from './container-data-provider';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import { toast } from 'sonner';

interface ContainerActionsProps {
  selectedContainers: string[];
  containers: ContainerData[];
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

export function ContainerActions({ selectedContainers, containers, onActionComplete, onSelectionChange }: ContainerActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const selectedContainerData = containers.filter(container => 
    selectedContainers.includes(container.id)
  );

  const canStart = selectedContainerData.length > 0 && selectedContainerData.every(container => 
    ['stopped', 'exited', 'created', 'paused'].includes(container.state)
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
    ['stopped', 'exited', 'created', 'paused'].includes(container.state)
  );

  const handleAction = async (action: string, containerIds: string[]) => {
    // Filter out container IDs that no longer exist in the current containers list
    const existingContainerIds = containerIds.filter(id => 
      containers.some(container => container.id === id)
    );
    
    if (existingContainerIds.length === 0) {
      toast.error('No valid containers selected');
      return;
    }
    
    setIsLoading(action);
    try {
      if (existingContainerIds.length === 1) {
        // Single container operation
        await invoke(action, { id: existingContainerIds[0] });
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
        const bulkAction = bulkActionMap[action] || `bulk_${action}`;
        await invoke(bulkAction, { ids: existingContainerIds });
      }
      
      const actionName = action.replace('_container', '').replace('unpause', 'resume');
      const containerText = existingContainerIds.length === 1 ? 'container' : 'containers';
      
      toast.success(`${actionName.charAt(0).toUpperCase() + actionName.slice(1)}ed ${existingContainerIds.length} ${containerText}`);
      
      // Clear selections for destructive actions
      if (action === 'remove_container') {
        onSelectionChange?.([]);
      }
      
      // Add a small delay to ensure the backend operation completes before refreshing
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error(`Error ${action}ing container:`, error);
      const actionName = action.replace('_container', '').replace('unpause', 'resume');
      toast.error(`Failed to ${actionName} container: ${error}`);
      
      // Refresh even on error to ensure UI is in sync
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    } finally {
      setIsLoading(null);
    }
  };

  const handleStart = () => handleAction('start_container', selectedContainers);
  const handleStop = () => handleAction('stop_container', selectedContainers);
  const handlePause = () => handleAction('pause_container', selectedContainers);
  const handleResume = () => handleAction('unpause_container', selectedContainers);
  const handleRestart = () => handleAction('restart_container', selectedContainers);
  const handleDelete = () => handleAction('remove_container', selectedContainers);

  return (
    <div className="flex items-center space-x-2">
      <Button variant="default">
        <Plus className="mr-2 h-4 w-4" />
        Run New Container
      </Button>
      
      {selectedContainers.length > 0 && (
        <>
          {canStart && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleStart}
              disabled={isLoading === 'start_container'}
            >
              <Play className="mr-2 h-4 w-4" />
              {isLoading === 'start_container' ? 'Starting...' : 'Start'}
            </Button>
          )}
          
          {canStop && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleStop}
              disabled={isLoading === 'stop_container'}
            >
              <Square className="mr-2 h-4 w-4" />
              {isLoading === 'stop_container' ? 'Stopping...' : 'Stop'}
            </Button>
          )}
          
          {canPause && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handlePause}
              disabled={isLoading === 'pause_container'}
            >
              <Pause className="mr-2 h-4 w-4" />
              {isLoading === 'pause_container' ? 'Pausing...' : 'Pause'}
            </Button>
          )}
          
          {canResume && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResume}
              disabled={isLoading === 'unpause_container'}
            >
              <ResumeIcon className="mr-2 h-4 w-4" />
              {isLoading === 'unpause_container' ? 'Resuming...' : 'Resume'}
            </Button>
          )}
          
          {canRestart && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRestart}
              disabled={isLoading === 'restart_container'}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {isLoading === 'restart_container' ? 'Restarting...' : 'Restart'}
            </Button>
          )}
          
          {canDelete && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDelete}
              disabled={isLoading === 'remove_container'}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isLoading === 'remove_container' ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}