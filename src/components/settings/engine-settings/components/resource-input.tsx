import { Label } from '../../../ui/label';
import { Input } from '../../../ui/input';
import { LucideIcon } from 'lucide-react';

interface ResourceInputProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  icon: LucideIcon;
  unit: string;
  className?: string;
}

export const ResourceInput = ({
  id,
  label,
  value,
  min,
  max,
  onChange,
  icon: Icon,
  unit,
  className = '',
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
      />
      <div className="text-xs text-muted-foreground">
        <Icon className="h-3 w-3 inline mr-1" />
        {value} {unit}
      </div>
    </div>
  );
};
