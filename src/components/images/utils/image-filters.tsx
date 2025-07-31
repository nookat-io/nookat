import { Button } from '../../ui/button';

interface ImageFiltersProps {
  filter: 'all' | 'used' | 'dangling';
  onFilterChange: (_filter: 'all' | 'used' | 'dangling') => void;
}

export function ImageFilters({ filter, onFilterChange }: ImageFiltersProps) {
  return (
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
  );
}
