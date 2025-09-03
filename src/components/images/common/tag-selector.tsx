import { useState, useRef, useEffect, useCallback } from 'react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Loader2, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TagSelectorProps {
  tag: string;
  onTagChange: (tag: string) => void;
  disabled?: boolean;
  isLoadingTags?: boolean;
  tagError?: string | null;
  tagSuggestions?: string[];
}

export function TagSelector({
  tag,
  onTagChange,
  disabled = false,
  isLoadingTags = false,
  tagError = null,
  tagSuggestions = [],
}: TagSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [inputValue, setInputValue] = useState(tag);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input value
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredSuggestions(tagSuggestions);
    } else {
      const filtered = tagSuggestions.filter(suggestion =>
        suggestion.toLowerCase().startsWith(inputValue.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    }
    setFocusedIndex(-1);
  }, [inputValue, tagSuggestions]);

  // Sync input value with tag prop
  useEffect(() => {
    setInputValue(tag);
  }, [tag]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onTagChange(value);
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    if (!disabled && tagSuggestions.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow click events on suggestions
    setTimeout(() => {
      setIsDropdownOpen(false);
      setFocusedIndex(-1);
    }, 150);
  };

  const selectTag = useCallback(
    (selectedTag: string) => {
      setInputValue(selectedTag);
      onTagChange(selectedTag);
      setIsDropdownOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.blur();
    },
    [onTagChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen || filteredSuggestions.length === 0) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsDropdownOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredSuggestions.length) {
          selectTag(filteredSuggestions[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="pull-tag">Tag</Label>
      <div className="relative" ref={containerRef}>
        <Input
          ref={inputRef}
          id="pull-tag"
          placeholder={disabled ? 'Select an image first' : 'latest'}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
          className="pr-8"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {isLoadingTags && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!isLoadingTags && !disabled && tagSuggestions.length > 0 && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isDropdownOpen && 'rotate-180'
              )}
            />
          )}
        </div>

        {/* Dropdown */}
        {isDropdownOpen && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                  index === focusedIndex && 'bg-accent text-accent-foreground'
                )}
                onClick={() => selectTag(suggestion)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}

        {tagError && (
          <p className="text-sm text-destructive mt-1">{tagError}</p>
        )}
      </div>
    </div>
  );
}
