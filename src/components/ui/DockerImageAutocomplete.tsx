import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Star, Download, Crown, Zap, Loader2 } from 'lucide-react';
import {
  DockerHubImage,
  DockerImageAutocompleteProps,
} from '../../types/docker-images';
import { searchDockerHub, formatNumber } from '../../lib/docker';

export function DockerImageAutocomplete({
  value,
  onChange,
  placeholder = 'Search Docker Hub images...',
  className = '',
}: DockerImageAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<DockerHubImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await searchDockerHub(query);

      const images = result.results || [];

      // Sort: Official images first, then by star count (descending)
      const sortedImages = images
        .sort((a: DockerHubImage, b: DockerHubImage) => {
          if (a.is_official && !b.is_official) return -1;
          if (!a.is_official && b.is_official) return 1;
          return b.star_count - a.star_count;
        })
        .slice(0, 10); // Limit to 10 results

      setSearchResults(sortedImages);
      setIsOpen(true);
    } catch {
      setError('Failed to search Docker Hub. Please try again.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input changes with debouncing
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange(newValue);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for search
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(newValue);
      }, 300);
    },
    [onChange, performSearch]
  );

  // Handle image selection
  const handleImageSelect = useCallback(
    (image: DockerHubImage) => {
      const imageName = image.is_official
        ? `library/${image.name}`
        : image.name;
      const fullName = `${imageName}:latest`;
      setInputValue(fullName);
      onChange(fullName);
      setIsOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.blur();
    },
    [onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || searchResults.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
            handleImageSelect(searchResults[focusedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, searchResults, focusedIndex, handleImageSelect]
  );

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-72 overflow-y-auto">
          {error ? (
            <div className="p-3 text-sm text-destructive">{error}</div>
          ) : searchResults.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No images found
            </div>
          ) : (
            searchResults.map((image, index) => (
              <div
                key={image.name}
                className={`w-full justify-start p-3 h-auto text-left hover:bg-muted/50 cursor-pointer ${
                  index === focusedIndex ? 'bg-muted/50' : ''
                }`}
                onClick={() => handleImageSelect(image)}
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
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Official
                          </div>
                        </div>
                      )}
                      {image.is_automated && (
                        <div className="relative group">
                          <Zap className="h-3 w-3 text-blue-500" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
