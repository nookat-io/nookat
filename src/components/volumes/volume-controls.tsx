import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search } from 'lucide-react';

interface VolumeControlsProps {
  filter: 'all' | 'used' | 'unused';
  onFilterChange: (filter: 'all' | 'used' | 'unused') => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
}

export function VolumeControls({
  filter,
  onFilterChange,
  searchTerm,
  onSearchChange,
}: VolumeControlsProps) {
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
          variant={filter === 'used' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('used')}
        >
          In Use
        </Button>
        <Button
          variant={filter === 'unused' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('unused')}
        >
          Unused
        </Button>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          size={16}
        />
        <Input
          type="text"
          placeholder="Search volumes..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10 w-64"
        />
      </div>
    </div>
  );
}
