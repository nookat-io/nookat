import { useState, useRef, useEffect, useMemo } from 'react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Loader2, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { TagMessage } from './types';

interface TagSelectorProps {
  tag: string;
  onTagChange: (tag: string) => void;
  disabled?: boolean;
  isLoadingTags?: boolean;
  message?: TagMessage | null;
  tagSuggestions?: string[];
}

const MESSAGE_ID = 'pull-tag-message';

interface Highlight {
  within: string[];
  index: number;
}

const NO_SUGGESTIONS: string[] = [];
const NO_HIGHLIGHT: Highlight = { within: NO_SUGGESTIONS, index: -1 };

function suggestionsMatching(suggestions: string[], typed: string) {
  if (!typed.trim()) {
    return suggestions;
  }
  const part = typed.toLowerCase();
  return suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(part)
  );
}

export function TagSelector({
  tag,
  onTagChange,
  disabled = false,
  isLoadingTags = false,
  message = null,
  tagSuggestions = NO_SUGGESTIONS,
}: TagSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlight, setHighlight] = useState(NO_HIGHLIGHT);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = useMemo(
    () => suggestionsMatching(tagSuggestions, tag),
    [tagSuggestions, tag]
  );
  const focusedIndex =
    highlight.within === filteredSuggestions
      ? highlight.index
      : NO_HIGHLIGHT.index;

  const highlightSuggestion = (index: number) =>
    setHighlight({ within: filteredSuggestions, index });

  const closeDropdown = () => {
    setIsDropdownOpen(false);
    setHighlight(NO_HIGHLIGHT);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTagChange(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    if (!disabled && tagSuggestions.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const keepFocusOnTheInput = (e: React.MouseEvent) => e.preventDefault();

  const selectTag = (selectedTag: string) => {
    onTagChange(selectedTag);
    closeDropdown();
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen || filteredSuggestions.length === 0) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsDropdownOpen(true);
      }
      return;
    }

    const lastIndex = filteredSuggestions.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightSuggestion(focusedIndex < lastIndex ? focusedIndex + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlightSuggestion(focusedIndex > 0 ? focusedIndex - 1 : lastIndex);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex <= lastIndex) {
          selectTag(filteredSuggestions[focusedIndex]);
        }
        break;
      case 'Escape':
        closeDropdown();
        inputRef.current?.blur();
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlight(NO_HIGHLIGHT);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="pull-tag">Tag</Label>
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <Input
            ref={inputRef}
            id="pull-tag"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isDropdownOpen && filteredSuggestions.length > 0}
            aria-describedby={message ? MESSAGE_ID : undefined}
            aria-invalid={message?.tone === 'error'}
            placeholder={disabled ? 'Select an image first' : 'Choose a tag'}
            value={tag}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={closeDropdown}
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
        </div>

        {isDropdownOpen && filteredSuggestions.length > 0 && (
          <div
            role="listbox"
            onMouseDown={keepFocusOnTheInput}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                role="option"
                aria-selected={index === focusedIndex}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                  index === focusedIndex && 'bg-accent text-accent-foreground'
                )}
                onClick={() => selectTag(suggestion)}
                onMouseEnter={() => highlightSuggestion(index)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}

        {message && (
          <p
            id={MESSAGE_ID}
            className={cn(
              'text-sm mt-1',
              message.tone === 'error'
                ? 'text-destructive'
                : 'text-muted-foreground'
            )}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
