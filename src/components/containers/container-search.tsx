import { Search } from "lucide-react";

interface ContainerSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function ContainerSearch({ searchTerm, onSearchChange }: ContainerSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
      <input
        type="text"
        placeholder="Search containers..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      />
    </div>
  );
} 