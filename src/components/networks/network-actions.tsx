import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { bulkRemoveNetworks } from './network-actions-service';
import { toast } from 'sonner';
import { useState } from 'react';
import { errorMessage } from '../../utils/error-message';
import { NetworkCreateDialog } from './network-create-dialog';

interface NetworkActionsProps {
  selectedNetworks: string[];
  networkNames: readonly string[];
  onSelectionChange?: (selected: string[]) => void;
}

export function NetworkActions({
  selectedNetworks,
  networkNames,
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
      onSelectionChange?.([]);
    } catch (error) {
      console.error('Failed to delete networks:', error);
      toast.error(errorMessage(error, 'Failed to delete networks'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <NetworkCreateDialog existingNetworkNames={networkNames} />
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
