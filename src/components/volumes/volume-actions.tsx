import { Button } from '../ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface VolumeActionsProps {
  selectedVolumes: string[];
}

export function VolumeActions({ selectedVolumes }: VolumeActionsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button variant="default">
        <Plus className="mr-2 h-4 w-4" />
        Create Volume
      </Button>
      
      {selectedVolumes.length > 0 && (
        <Button variant="outline" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Selected
        </Button>
      )}
    </div>
  );
}