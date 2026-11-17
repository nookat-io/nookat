import { Button } from '../ui/button';
import {
  Play,
  Square,
  RotateCcw,
  Trash2,
  Pause,
  Play as ResumeIcon,
} from 'lucide-react';
import { Container } from './container-types';
import {
  canDeleteContainer,
  canPauseContainer,
  canRestartContainer,
  canResumeContainer,
  canStartContainer,
  canStopContainer,
  isContainerRunning,
} from './container-utils';
import { useState } from 'react';
import { ContainerActionService } from './container-actions-service';
import { ContainerPruneConfirmDialog } from './dialogs/ContainerPruneConfirmDialog';

interface ContainerActionsProps {
  selectedContainers: string[];
  containers: Container[];
  onSelectionChange?: (selected: string[]) => void;
}

export function ContainerActions({
  selectedContainers,
  containers,
  onSelectionChange,
}: ContainerActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [pruneDialogOpen, setPruneDialogOpen] = useState(false);

  const selectedContainerData = containers.filter(container =>
    selectedContainers.includes(container.id)
  );

  const allSelected = (predicate: (container: Container) => boolean) =>
    selectedContainerData.length > 0 && selectedContainerData.every(predicate);

  const canStart = allSelected(canStartContainer);
  const canStop = allSelected(canStopContainer);
  const canPause = allSelected(canPauseContainer);
  const canResume = allSelected(canResumeContainer);
  const canRestart = allSelected(canRestartContainer);
  const canDelete = allSelected(canDeleteContainer);

  const handleAction = async (
    action: () => Promise<unknown>,
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
      () => ContainerActionService.bulkStartContainers(selectedContainers),
      'start'
    );

  const handleStop = () =>
    handleAction(
      () => ContainerActionService.bulkStopContainers(selectedContainers),
      'stop'
    );

  const handlePause = () =>
    handleAction(
      () => ContainerActionService.bulkPauseContainers(selectedContainers),
      'pause'
    );

  const handleResume = () =>
    handleAction(
      () => ContainerActionService.bulkResumeContainers(selectedContainers),
      'resume'
    );

  const handleRestart = () =>
    handleAction(
      () => ContainerActionService.bulkRestartContainers(selectedContainers),
      'restart'
    );

  const handleDelete = () =>
    handleAction(async () => {
      const hasRunning = selectedContainerData.some(isContainerRunning);
      const deleted = await ContainerActionService.bulkDeleteContainers(
        selectedContainers,
        hasRunning
      );
      if (deleted) {
        onSelectionChange?.([]);
      }
    }, 'delete');

  const handlePrune = () =>
    handleAction(async () => {
      await ContainerActionService.pruneContainers();
      setPruneDialogOpen(false);
    }, 'prune');

  if (selectedContainers.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <ContainerPruneConfirmDialog
          open={pruneDialogOpen}
          isPruning={isLoading === 'prune'}
          onOpenChange={setPruneDialogOpen}
          onConfirm={handlePrune}
        />
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
