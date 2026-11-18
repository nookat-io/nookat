import { useState } from 'react';
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
  const [typedText, setTypedText] = useState<string | null>(null);
  const withinRange = (number: number) => Math.min(max, Math.max(min, number));

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={typedText ?? value}
        onChange={e => {
          setTypedText(e.target.value);
          const typedNumber = parseInt(e.target.value, 10);
          if (!Number.isNaN(typedNumber)) {
            onChange(typedNumber);
          }
        }}
        onBlur={() => {
          setTypedText(null);
          if (withinRange(value) !== value) {
            onChange(withinRange(value));
          }
        }}
        disabled={disabled}
      />
    </div>
  );
};
