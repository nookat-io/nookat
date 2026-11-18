import { Search, Loader2, Crown, Zap, Star, Download } from 'lucide-react';
import { Input } from '../../ui/input';
import { DockerHubImage } from '../../../types/docker-images';
import { formatNumber } from './utils';

interface DockerHubSearchProps {
  searchQuery: string;
  searchResults: DockerHubImage[];
  isSearching: boolean;
  searchError: string | null;
  isSearchDropdownOpen: boolean;
  focusedSearchIndex: number;
  onSearchChange: (query: string) => void;
  onImageSelect: (image: DockerHubImage) => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;

  disabled?: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  hasSelectedImage?: boolean;
}

export function DockerHubSearch({
  searchQuery,
  searchResults,
  isSearching,
  searchError,
  isSearchDropdownOpen,
  focusedSearchIndex,
  onSearchChange,
  onImageSelect,
  onSearchKeyDown,

  disabled = false,
  containerRef,
  inputRef,
}: DockerHubSearchProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="pull-image-name" className="text-sm font-medium">
        Image Name
      </label>
      <div ref={containerRef} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          id="pull-image-name"
          placeholder="Search Docker Hub images..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          className="pl-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {isSearchDropdownOpen && (
          <div className="absolute z-9999 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-xl max-h-72 overflow-y-auto left-0 top-full">
            {searchError ? (
              <div className="p-3 text-sm text-destructive">{searchError}</div>
            ) : searchResults.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No images found
              </div>
            ) : (
              <>
                {searchResults.map((image, index) => (
                  <div
                    key={image.name}
                    className={`w-full justify-start p-3 h-auto text-left hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors ${
                      index === focusedSearchIndex
                        ? 'bg-accent text-accent-foreground'
                        : ''
                    }`}
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      onImageSelect(image);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {image.name}
                          </span>
                          {image.is_official && (
                            <div className="relative group">
                              <Crown className="h-3 w-3 text-yellow-500" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-background bg-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                Official
                              </div>
                            </div>
                          )}
                          {image.is_automated && (
                            <div className="relative group">
                              <Zap className="h-3 w-3 text-blue-500" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-background bg-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                Automated
                              </div>
                            </div>
                          )}
                        </div>
                        {image.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {image.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            <span>{formatNumber(image.star_count)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span>{formatNumber(image.pull_count)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
