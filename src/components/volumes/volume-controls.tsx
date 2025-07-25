import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

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
    <div className="flex items-center space-x-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search volumes..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            {filter === 'all' && 'All Volumes'}
            {filter === 'used' && 'Used Volumes'}
            {filter === 'unused' && 'Unused Volumes'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onFilterChange('all')}>
            All Volumes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFilterChange('used')}>
            Used Volumes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFilterChange('unused')}>
            Unused Volumes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
