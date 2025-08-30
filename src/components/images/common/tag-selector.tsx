import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { COMMON_TAGS } from './utils';

interface TagSelectorProps {
  tag: string;
  onTagChange: (tag: string) => void;
  showSuggestions?: boolean;
  disabled?: boolean;
}

export function TagSelector({
  tag,
  onTagChange,
  showSuggestions = false,
  disabled = false,
}: TagSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="pull-tag">Tag</Label>
      <div className="space-y-2">
        <Input
          id="pull-tag"
          placeholder="latest"
          value={tag}
          onChange={e => onTagChange(e.target.value)}
          disabled={disabled}
        />

        {/* Tag Suggestions */}
        {showSuggestions && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Common tags:</span>
            {COMMON_TAGS.map(suggestedTag => (
              <button
                key={suggestedTag}
                type="button"
                onClick={() => onTagChange(suggestedTag)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  tag === suggestedTag
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {suggestedTag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
