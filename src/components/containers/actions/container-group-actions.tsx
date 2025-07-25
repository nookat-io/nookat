'use client';

import { Button } from '../../ui/button';
import { Play, Square, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

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
  const handleBulkAction = async (action: string, containerIds: string[]) => {
    try {
      await invoke(action, { ids: containerIds });
      
      const actionName = action.replace('bulk_', '').replace('_containers', '').replace('unpause', 'resume');
      toast.success(`${actionName.charAt(0).toUpperCase() + actionName.slice(1)}ed ${containerIds.length} containers`);
      
      // Add a small delay to ensure the backend operation completes before refreshing
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error(`Error ${action}ing containers:`, error);
      const actionName = action.replace('bulk_', '').replace('_containers', '').replace('unpause', 'resume');
      toast.error(`Failed to ${actionName} containers: ${error}`);
      
      // Refresh even on error to ensure UI is in sync
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    }
  };

  return (
    <div className="flex gap-1">
      {/* Start action for stopped groups */}
      {allStopped && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction('bulk_start_containers', containerIds)}
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
          onClick={() => handleBulkAction('bulk_stop_containers', containerIds)}
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
        onClick={() => {
          const action = hasRunningContainers ? 'bulk_force_remove_containers' : 'bulk_remove_containers';
          handleBulkAction(action, containerIds);
        }}
        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
      >
        <Trash2 className="mr-1 h-3 w-3" />
        Delete
      </Button>
    </div>
  );
} 