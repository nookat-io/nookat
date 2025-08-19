interface CapacityBarProps {
  label: string;
  value: string | number;
  maxValue?: number;
  description?: string;
  className?: string;
}

export const CapacityBar = ({
  label,
  value,
  maxValue,
  description,
  className = '',
}: CapacityBarProps) => {
  const percentage = maxValue ? (Number(value) / maxValue) * 100 : 100;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
        <div
          className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {description && (
        <div className="text-xs text-muted-foreground">{description}</div>
      )}
    </div>
  );
};
