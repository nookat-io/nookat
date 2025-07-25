'use client';

import { useState } from 'react';
import { Button } from '../../ui/button';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Terminal, 
  MoreHorizontal,
  ExternalLink,
  Pause
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { ContainerData } from '../data/container-data-provider';

interface ContainerRowActionsProps {
  container: ContainerData;
  onActionComplete?: () => void;
  onOpenLogs: (container: ContainerData) => void;
}

export function ContainerRowActions({ 
  container, 
  onActionComplete,
  onOpenLogs 
}: ContainerRowActionsProps) {
  const [openingTerminal, setOpeningTerminal] = useState(false);

  const handleContainerAction = async (action: string, containerId: string) => {
    try {
      await invoke(action, { id: containerId });
      
      const actionName = action.replace('_container', '').replace('unpause', 'resume');
      toast.success(`${actionName.charAt(0).toUpperCase() + actionName.slice(1)}ed container`);
      
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
    }
  };

  const handleDeleteContainer = async (containerId: string) => {
    try {
      // Use force removal for running containers, regular removal for others
      const action = container.state === 'running' ? 'force_remove_container' : 'remove_container';
      await invoke(action, { id: containerId });
      
      const actionText = container.state === 'running' ? 'Force deleted' : 'Deleted';
      toast.success(`${actionText} container`);
      
      // Add a small delay to ensure the backend operation completes before refreshing
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error('Error deleting container:', error);
      toast.error(`Failed to delete container: ${error}`);
      
      // Refresh even on error to ensure UI is in sync
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    }
  };

  const handleOpenTerminal = async (containerId: string) => {
    try {
      setOpeningTerminal(true);
      await invoke('open_terminal', { id: containerId });
      toast.success('Terminal opened');
    } catch (error) {
      console.error('Error opening terminal:', error);
      toast.error(`Failed to open terminal: ${error}`);
    } finally {
      setOpeningTerminal(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Start action - available for stopped, exited, created containers */}
        {['stopped', 'exited', 'created'].includes(container.state) && (
          <DropdownMenuItem onClick={() => handleContainerAction('start_container', container.id)}>
            <Play className="mr-2 h-4 w-4" />
            Start
          </DropdownMenuItem>
        )}
        
        {/* Stop action - available for running, restarting containers */}
        {['running', 'restarting'].includes(container.state) && (
          <DropdownMenuItem onClick={() => handleContainerAction('stop_container', container.id)}>
            <Square className="mr-2 h-4 w-4" />
            Stop
          </DropdownMenuItem>
        )}
        
        {/* Pause action - available for running containers */}
        {container.state === 'running' && (
          <DropdownMenuItem onClick={() => handleContainerAction('pause_container', container.id)}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </DropdownMenuItem>
        )}
        
        {/* Resume action - available for paused containers */}
        {container.state === 'paused' && (
          <DropdownMenuItem onClick={() => handleContainerAction('unpause_container', container.id)}>
            <Play className="mr-2 h-4 w-4" />
            Resume
          </DropdownMenuItem>
        )}
        
        {/* Restart action - available for running, restarting containers */}
        {['running', 'restarting'].includes(container.state) && (
          <DropdownMenuItem onClick={() => handleContainerAction('restart_container', container.id)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
          </DropdownMenuItem>
        )}
        
        {/* Terminal - available for running containers */}
        {container.state === 'running' && (
          <DropdownMenuItem 
            onClick={() => handleOpenTerminal(container.id)}
            disabled={openingTerminal}
          >
            <Terminal className="mr-2 h-4 w-4" />
            {openingTerminal ? 'Opening...' : 'Terminal'}
          </DropdownMenuItem>
        )}
        
        {/* Logs - available for all containers */}
        <DropdownMenuItem onClick={() => onOpenLogs(container)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Logs
        </DropdownMenuItem>
        
        {/* Delete action - available for stopped, exited, created containers */}
        {['stopped', 'exited', 'created', "running"].includes(container.state) && (
          <DropdownMenuItem 
            className="text-destructive"
            onClick={() => handleDeleteContainer(container.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {container.state === 'running' ? 'Force Delete' : 'Delete'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 