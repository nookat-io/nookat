import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Play,
  Square,
  RotateCcw,
  Trash2,
  Terminal,
  MoreHorizontal,
  ExternalLink,
  Pause,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Container, ContainerState } from './container-types';
import { ContainerActionService } from './container-actions-service';

interface ContainerRowActionsProps {
  container: Container;
  onActionComplete?: () => void;
  onOpenLogs: (container: Container) => void;
}

export function ContainerRowActions({
  container,
  onActionComplete,
  onOpenLogs,
}: ContainerRowActionsProps) {
  const [openingTerminal, setOpeningTerminal] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch {
      // Error handling is done in the service
    }
  };

  const handleOpenTerminal = async () => {
    setOpeningTerminal(true);
    try {
      if (container.id) {
        await ContainerActionService.openTerminal(container.id);
      }
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
        {container.state &&
          [ContainerState.Exited, ContainerState.Created].includes(
            container.state
          ) && (
            <DropdownMenuItem
              onClick={() =>
                container.id &&
                handleAction(() =>
                  ContainerActionService.startContainer(container.id, {
                    onActionComplete,
                  })
                )
              }
            >
              <Play className="mr-2 h-4 w-4" />
              Start
            </DropdownMenuItem>
          )}

        {/* Stop action - available for running, restarting containers */}
        {container.state &&
          ['running', 'restarting'].includes(container.state) && (
            <DropdownMenuItem
              onClick={() =>
                handleAction(() =>
                  ContainerActionService.stopContainer(container.id, {
                    onActionComplete,
                  })
                )
              }
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </DropdownMenuItem>
          )}

        {/* Pause action - available for running containers */}
        {container.state && container.state === 'running' && (
          <DropdownMenuItem
            onClick={() =>
              handleAction(() =>
                ContainerActionService.pauseContainer(container.id, {
                  onActionComplete,
                })
              )
            }
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </DropdownMenuItem>
        )}

        {/* Resume action - available for paused containers */}
        {container.state && container.state === 'paused' && (
          <DropdownMenuItem
            onClick={() =>
              handleAction(() =>
                ContainerActionService.resumeContainer(container.id, {
                  onActionComplete,
                })
              )
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Resume
          </DropdownMenuItem>
        )}

        {/* Restart action - available for running, restarting containers */}
        {container.state &&
          ['running', 'restarting'].includes(container.state) && (
            <DropdownMenuItem
              onClick={() =>
                handleAction(() =>
                  ContainerActionService.restartContainer(container.id, {
                    onActionComplete,
                  })
                )
              }
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restart
            </DropdownMenuItem>
          )}

        {/* Terminal - available for running containers */}
        {container.state && container.state === 'running' && (
          <DropdownMenuItem
            onClick={handleOpenTerminal}
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

        {/* Delete action - available for stopped, exited, created, running containers */}
        {container.state &&
          ['stopped', 'exited', 'created', 'running'].includes(
            container.state
          ) && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() =>
                handleAction(() =>
                  ContainerActionService.deleteContainer(
                    container.id,
                    container.state === 'running',
                    { onActionComplete }
                  )
                )
              }
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {container.state === 'running' ? 'Force Delete' : 'Delete'}
            </DropdownMenuItem>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
