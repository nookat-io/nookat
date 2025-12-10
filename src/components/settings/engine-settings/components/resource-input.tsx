import { Label } from '../../../ui/label';
import { Input } from '../../../ui/input';

interface ResourceInputProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export const ResourceInput = ({
  id,
  label,
  value,
  min,
  max,
  onChange,
  className = '',
  disabled = false,
}: ResourceInputProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || min)}
        disabled={disabled}
      />
    </div>
  );
};
