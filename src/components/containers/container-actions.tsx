import { Button } from '../ui/button';
import {
  Play,
  Square,
  RotateCcw,
  Trash2,
  Pause,
  Play as ResumeIcon,
  Trash,
} from 'lucide-react';
import { ContainerData } from './container-types';
import { useState } from 'react';
import { ContainerActionService } from './container-actions-service';

interface ContainerActionsProps {
  selectedContainers: string[];
  containers: ContainerData[];
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

export function ContainerActions({
  selectedContainers,
  containers,
  onActionComplete,
  onSelectionChange,
}: ContainerActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const selectedContainerData = containers.filter(container =>
    selectedContainers.includes(container.id)
  );

  const canStart =
    selectedContainerData.length > 0 &&
    selectedContainerData.every(container =>
      ['stopped', 'exited', 'created'].includes(container.state)
    );

  const canStop =
    selectedContainerData.length > 0 &&
    selectedContainerData.every(container =>
      ['running', 'restarting'].includes(container.state)
    );

  const canPause =
    selectedContainerData.length > 0 &&
    selectedContainerData.every(container => container.state === 'running');

  const canResume =
    selectedContainerData.length > 0 &&
    selectedContainerData.every(container => container.state === 'paused');

  const canRestart =
    selectedContainerData.length > 0 &&
    selectedContainerData.every(container =>
      ['running', 'restarting'].includes(container.state)
    );

  const canDelete =
    selectedContainerData.length > 0 &&
    selectedContainerData.every(container =>
      ['stopped', 'exited', 'created', 'running'].includes(container.state)
    );

  const handleAction = async (
    action: () => Promise<void>,
    actionName: string
  ) => {
    setIsLoading(actionName);
    try {
      await action();
    } finally {
      setIsLoading(null);
    }
  };

  const handleStart = () =>
    handleAction(
      () =>
        ContainerActionService.bulkStartContainers(selectedContainers, {
          onActionComplete,
          onSelectionChange,
        }),
      'start'
    );

  const handleStop = () =>
    handleAction(
      () =>
        ContainerActionService.bulkStopContainers(selectedContainers, {
          onActionComplete,
          onSelectionChange,
        }),
      'stop'
    );

  const handlePause = () =>
    handleAction(
      () =>
        ContainerActionService.bulkPauseContainers(selectedContainers, {
          onActionComplete,
          onSelectionChange,
        }),
      'pause'
    );

  const handleResume = () =>
    handleAction(
      () =>
        ContainerActionService.bulkResumeContainers(selectedContainers, {
          onActionComplete,
          onSelectionChange,
        }),
      'resume'
    );

  const handleRestart = () =>
    handleAction(
      () =>
        ContainerActionService.bulkRestartContainers(selectedContainers, {
          onActionComplete,
          onSelectionChange,
        }),
      'restart'
    );

  const handleDelete = () => {
    const hasRunning = selectedContainerData.some(c => c.state === 'running');
    handleAction(
      () =>
        ContainerActionService.bulkDeleteContainers(
          selectedContainers,
          hasRunning,
          { onActionComplete, onSelectionChange }
        ),
      'delete'
    );
  };

  const handlePrune = () =>
    handleAction(
      () => ContainerActionService.pruneContainers({ onActionComplete }),
      'prune'
    );

  if (selectedContainers.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrune}
          disabled={isLoading === 'prune'}
        >
          <Trash className="mr-2 h-4 w-4" />
          {isLoading === 'prune' ? 'Pruning...' : 'Prune Stopped'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {canStart && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleStart}
          disabled={isLoading === 'start'}
        >
          <Play className="mr-2 h-4 w-4" />
          {isLoading === 'start' ? 'Starting...' : 'Start'}
        </Button>
      )}

      {canStop && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          disabled={isLoading === 'stop'}
        >
          <Square className="mr-2 h-4 w-4" />
          {isLoading === 'stop' ? 'Stopping...' : 'Stop'}
        </Button>
      )}

      {canPause && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePause}
          disabled={isLoading === 'pause'}
        >
          <Pause className="mr-2 h-4 w-4" />
          {isLoading === 'pause' ? 'Pausing...' : 'Pause'}
        </Button>
      )}

      {canResume && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleResume}
          disabled={isLoading === 'resume'}
        >
          <ResumeIcon className="mr-2 h-4 w-4" />
          {isLoading === 'resume' ? 'Resuming...' : 'Resume'}
        </Button>
      )}

      {canRestart && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestart}
          disabled={isLoading === 'restart'}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {isLoading === 'restart' ? 'Restarting...' : 'Restart'}
        </Button>
      )}

      {canDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isLoading === 'delete'}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isLoading === 'delete' ? 'Deleting...' : 'Delete'}
        </Button>
      )}
    </div>
  );
}
