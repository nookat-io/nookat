import { Label } from '../../../ui/label';

interface InfoItemProps {
  label: string;
  value: string | number | null | undefined;
  fallback?: string;
}

export const InfoItem = ({
  label,
  value,
  fallback = 'Unknown',
}: InfoItemProps) => {
  const displayValue = value ?? fallback;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="text-sm text-muted-foreground">{displayValue}</div>
    </div>
  );
};
