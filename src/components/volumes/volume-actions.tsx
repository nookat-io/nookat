import { Button } from '../ui/button';
import { Trash2, Trash } from 'lucide-react';
import { useState } from 'react';
import { VolumeActionService } from './volume-actions-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

interface VolumeActionsProps {
  selectedVolumes: string[];
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

type ActionType = 'delete' | 'prune';

export function VolumeActions({
  selectedVolumes,
  onActionComplete,
  onSelectionChange,
}: VolumeActionsProps) {
  const [isLoading, setIsLoading] = useState<ActionType | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const hasSelectedVolumes = selectedVolumes.length > 0;

  const handleAction = async (
    action: () => Promise<void>,
    actionType: ActionType
  ) => {
    setIsLoading(actionType);
    try {
      await action();
    } finally {
      setIsLoading(null);
    }
  };

  const handleDelete = () => {
    handleAction(
      () =>
        VolumeActionService.bulkRemoveVolumes(selectedVolumes, {
          onActionComplete,
          onSelectionChange,
        }),
      'delete'
    );
  };

  const handlePrune = () => {
    if (isLoading === 'prune') return; // Prevent multiple simultaneous operations

    setConfirmDialogOpen(false);
    handleAction(
      () => VolumeActionService.pruneVolumes({ onActionComplete }),
      'prune'
    );
  };

  const renderPruneButton = () => (
    <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmDialogOpen(true)}
          disabled={isLoading === 'prune'}
        >
          <Trash className="mr-2 h-4 w-4" />
          {isLoading === 'prune' ? 'Pruning...' : 'Prune Unused'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Prune Operation</DialogTitle>
          <DialogDescription>
            This will remove all unused volumes from your system. <br />
            This action cannot be undone. Are you sure you want to continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setConfirmDialogOpen(false)}
            disabled={isLoading === 'prune'}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handlePrune}
            disabled={isLoading === 'prune'}
          >
            {isLoading === 'prune' ? 'Pruning...' : 'Prune Volumes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderDeleteButton = () => (
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
  );

  if (!hasSelectedVolumes) {
    return <div className="flex items-center gap-2">{renderPruneButton()}</div>;
  }

  return <div className="flex items-center gap-2">{renderDeleteButton()}</div>;
}
