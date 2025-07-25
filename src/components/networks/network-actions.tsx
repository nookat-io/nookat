import { Button } from '../ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface NetworkActionsProps {
  selectedNetworks: string[];
}

export function NetworkActions({ selectedNetworks }: NetworkActionsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button variant="default">
        <Plus className="mr-2 h-4 w-4" />
        Create Network
      </Button>

      {selectedNetworks.length > 0 && (
        <Button variant="outline" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Selected
        </Button>
      )}
    </div>
  );
}
