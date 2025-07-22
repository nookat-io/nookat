import { Button } from '../ui/button';
import { Play, Square, RotateCcw, Trash2, Plus, Pause, Play as ResumeIcon } from 'lucide-react';
import { ContainerData } from './container-data-provider';

interface ContainerActionsProps {
  selectedContainers: string[];
  containers: ContainerData[];
}

export function ContainerActions({ selectedContainers, containers }: ContainerActionsProps) {
  const selectedContainerData = containers.filter(container => 
    selectedContainers.includes(container.id)
  );

  const canStart = selectedContainerData.some(container => 
    ['stopped', 'exited', 'created', 'paused'].includes(container.state)
  );

  const canStop = selectedContainerData.some(container => 
    ['running', 'restarting'].includes(container.state)
  );

  const canPause = selectedContainerData.some(container => 
    container.state === 'running'
  );

  const canResume = selectedContainerData.some(container => 
    container.state === 'paused'
  );

  const canRestart = selectedContainerData.some(container => 
    ['running', 'restarting'].includes(container.state)
  );

  const canDelete = selectedContainerData.some(container => 
    ['stopped', 'exited', 'created', 'paused'].includes(container.state)
  );

  return (
    <div className="flex items-center space-x-2">
      <Button variant="default">
        <Plus className="mr-2 h-4 w-4" />
        Run New Container
      </Button>
      
      {selectedContainers.length > 0 && (
        <>
          {canStart && (
            <Button variant="outline" size="sm">
              <Play className="mr-2 h-4 w-4" />
              Start
            </Button>
          )}
          
          {canStop && (
            <Button variant="outline" size="sm">
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
          
          {canPause && (
            <Button variant="outline" size="sm">
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          
          {canResume && (
            <Button variant="outline" size="sm">
              <ResumeIcon className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
          
          {canRestart && (
            <Button variant="outline" size="sm">
              <RotateCcw className="mr-2 h-4 w-4" />
              Restart
            </Button>
          )}
          
          {canDelete && (
            <Button variant="outline" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </>
      )}
    </div>
  );
}