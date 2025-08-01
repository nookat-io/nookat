import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { bulkRemoveNetworks } from './network-actions-utils';
import { toast } from 'sonner';
import { useState } from 'react';

interface NetworkActionsProps {
  selectedNetworks: string[];
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

export function NetworkActions({
  selectedNetworks,
  onActionComplete,
  onSelectionChange,
}: NetworkActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteSelected = async () => {
    if (selectedNetworks.length === 0) return;

    setIsDeleting(true);
    try {
      await bulkRemoveNetworks(selectedNetworks);
      toast.success(
        `Successfully deleted ${selectedNetworks.length} network(s)`
      );
      onActionComplete?.();
      onSelectionChange?.([]);
    } catch (error) {
      console.error('Failed to delete networks:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete networks';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {selectedNetworks.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? 'Deleting...' : 'Delete Selected'}
        </Button>
      )}
    </div>
  );
}
