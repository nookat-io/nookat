import { FilterType } from '../../hooks/use-page-state';
import { Input } from './input';
import { Search, Filter } from 'lucide-react';

export interface FilterOption {
  value: FilterType;
  label: string;
}

export interface GenericControlsProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;
  filterOptions: FilterOption[];
  placeholder?: string;
}

export function GenericControls({
  filter,
  onFilterChange,
  searchTerm,
  onSearchChange,
  filterOptions,
  placeholder = 'Search...',
}: GenericControlsProps) {
  return (
    <div className="flex items-center space-x-4">
      {/* Search input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter dropdown */}
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={filter}
          onChange={e => onFilterChange(e.target.value as FilterType)}
          className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
