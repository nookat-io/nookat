import { Label } from '../../ui/label';
import { Input } from '../../ui/input';

interface TagSelectorProps {
  tag: string;
  onTagChange: (tag: string) => void;
  showSuggestions?: boolean;
  disabled?: boolean;
}

export function TagSelector({
  tag,
  onTagChange,
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
      </div>
    </div>
  );
}
