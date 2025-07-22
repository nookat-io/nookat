import { ContainerFilters } from './container-filters';
import { ContainerSearch } from './container-search';

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
  onSearchChange 
}: ContainerControlsProps) {
  return (
    <div className="content-section">
      <div className="flex items-center justify-between">
        <ContainerFilters filter={filter} onFilterChange={onFilterChange} />
        <ContainerSearch searchTerm={searchTerm} onSearchChange={onSearchChange} />
      </div>
    </div>
  );
} 