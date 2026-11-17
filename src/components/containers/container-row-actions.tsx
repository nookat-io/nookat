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
import { Container } from './container-types';
import { ContainerActionService } from './container-actions-service';
import {
  canDeleteContainer,
  canOpenContainerTerminal,
  canPauseContainer,
  canRestartContainer,
  canResumeContainer,
  canStartContainer,
  canStopContainer,
  isContainerRunning,
} from './container-utils';

interface ContainerRowActionsProps {
  container: Container;
  onOpenLogs: (container: Container) => void;
}

export function ContainerRowActions({
  container,
  onOpenLogs,
}: ContainerRowActionsProps) {
  const [openingTerminal, setOpeningTerminal] = useState(false);
  const isRunning = isContainerRunning(container);

  const handleOpenTerminal = async () => {
    setOpeningTerminal(true);
    try {
      await ContainerActionService.openTerminal(container.id);
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
        {canStartContainer(container) && (
          <DropdownMenuItem
            onClick={() => ContainerActionService.startContainer(container.id)}
          >
            <Play className="mr-2 h-4 w-4" />
            Start
          </DropdownMenuItem>
        )}

        {canStopContainer(container) && (
          <DropdownMenuItem
            onClick={() => ContainerActionService.stopContainer(container.id)}
          >
            <Square className="mr-2 h-4 w-4" />
            Stop
          </DropdownMenuItem>
        )}

        {canPauseContainer(container) && (
          <DropdownMenuItem
            onClick={() => ContainerActionService.pauseContainer(container.id)}
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </DropdownMenuItem>
        )}

        {canResumeContainer(container) && (
          <DropdownMenuItem
            onClick={() => ContainerActionService.resumeContainer(container.id)}
          >
            <Play className="mr-2 h-4 w-4" />
            Resume
          </DropdownMenuItem>
        )}

        {canRestartContainer(container) && (
          <DropdownMenuItem
            onClick={() =>
              ContainerActionService.restartContainer(container.id)
            }
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
          </DropdownMenuItem>
        )}

        {canOpenContainerTerminal(container) && (
          <DropdownMenuItem
            onClick={handleOpenTerminal}
            disabled={openingTerminal}
          >
            <Terminal className="mr-2 h-4 w-4" />
            {openingTerminal ? 'Opening...' : 'Terminal'}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => onOpenLogs(container)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Logs
        </DropdownMenuItem>

        {canDeleteContainer(container) && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() =>
              ContainerActionService.deleteContainer(container.id, isRunning)
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isRunning ? 'Force Delete' : 'Delete'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
