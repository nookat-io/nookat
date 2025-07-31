import { Button } from '../../ui/button';
import { Trash2, Trash } from 'lucide-react';
import { useState } from 'react';
import { VolumeActionService } from '../utils/volume-actions';

interface VolumeActionsProps {
  selectedVolumes: string[];
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

export function VolumeActions({
  selectedVolumes,
  onActionComplete,
  onSelectionChange,
}: VolumeActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const canDelete = selectedVolumes.length > 0;

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

  const handleDelete = () =>
    handleAction(
      () =>
        VolumeActionService.bulkRemoveVolumes(selectedVolumes, {
          onActionComplete,
          onSelectionChange,
        }),
      'delete'
    );

  const handlePrune = () =>
    handleAction(
      () => VolumeActionService.pruneVolumes({ onActionComplete }),
      'prune'
    );

  if (selectedVolumes.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrune}
          disabled={isLoading === 'prune'}
        >
          <Trash className="mr-2 h-4 w-4" />
          {isLoading === 'prune' ? 'Pruning...' : 'Prune Unused'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
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
