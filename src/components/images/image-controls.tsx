import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';

interface ImageControlsProps {
  filter: 'all' | 'used' | 'dangling';
  onFilterChange: (filter: 'all' | 'used' | 'dangling') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function ImageControls({ 
  filter, 
  onFilterChange, 
  searchTerm, 
  onSearchChange 
}: ImageControlsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center space-x-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('all')}
        >
          All Images
        </Button>
        <Button 
          variant={filter === 'used' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('used')}
        >
          In Use
        </Button>
        <Button 
          variant={filter === 'dangling' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('dangling')}
        >
          Dangling
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          type="text"
          placeholder="Search images..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-64"
        />
      </div>
    </div>
  );
} 