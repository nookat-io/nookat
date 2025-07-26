import { Input } from '../ui/input';
import { NetworkFilter } from './use-network-page-state';

interface NetworkControlsProps {
  filter: NetworkFilter;
  onFilterChange: (filter: NetworkFilter) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
}

export function NetworkControls({
  searchTerm,
  onSearchChange,
}: NetworkControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <Input
          placeholder="Search networks..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="max-w-sm"
        />
      </div>
      {/* Additional filters can be added here in the future */}
    </div>
  );
}
