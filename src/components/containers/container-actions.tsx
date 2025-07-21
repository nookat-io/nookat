import { Button } from '../ui/button';
import { Play, Square, RotateCcw, Trash2, Plus } from 'lucide-react';

interface ContainerActionsProps {
  selectedContainers: string[];
}

export function ContainerActions({ selectedContainers }: ContainerActionsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button variant="default">
        <Plus className="mr-2 h-4 w-4" />
        Run New Container
      </Button>
      
      {selectedContainers.length > 0 && (
        <>
          <Button variant="outline" size="sm">
            <Play className="mr-2 h-4 w-4" />
            Start
          </Button>
          <Button variant="outline" size="sm">
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </>
      )}
    </div>
  );
}