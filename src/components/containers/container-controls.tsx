import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';

interface ContainerControlsProps {
  filter: 'all' | 'running' | 'stopped';
  onFilterChange: (filter: 'all' | 'running' | 'stopped') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function ContainerControls({
  filter,
  onFilterChange,
  searchTerm,
  onSearchChange,
}: ContainerControlsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
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

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          size={16}
        />
        <Input
          type="text"
          placeholder="Search containers..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10 w-64"
        />
      </div>
    </div>
  );
}
