import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';

interface NetworkControlsProps {
  filter: 'all' | 'system' | 'others';
  onFilterChange: (filter: 'all' | 'system' | 'others') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function NetworkControls({
  filter,
  onFilterChange,
  searchTerm,
  onSearchChange,
}: NetworkControlsProps) {
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
          variant={filter === 'system' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('system')}
        >
          System
        </Button>
        <Button
          variant={filter === 'others' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('others')}
        >
          Others
        </Button>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          size={16}
        />
        <Input
          type="text"
          placeholder="Search networks..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10 w-64"
        />
      </div>
    </div>
  );
}
