import { Button } from '../ui/button';

interface ContainerFiltersProps {
  filter: 'all' | 'running' | 'stopped';
  onFilterChange: (_filter: 'all' | 'running' | 'stopped') => void;
}

export function ContainerFilters({ filter, onFilterChange }: ContainerFiltersProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant={filter === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange('all')}
      >
        All
      </Button>
      <Button 
        variant={filter === 'running' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange('running')}
      >
        Running
      </Button>
      <Button 
        variant={filter === 'stopped' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange('stopped')}
      >
        Stopped
      </Button>
    </div>
  );
}