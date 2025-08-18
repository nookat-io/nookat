import { cn } from '../../../../lib/utils';

interface StatCardProps {
  value: string | number;
  label: string;
  variant?: 'blue' | 'yellow' | 'red' | 'green';
  className?: string;
}

const variantStyles = {
  blue: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400',
  yellow:
    'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400',
  red: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400',
  green: 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400',
};

export const StatCard = ({
  value,
  label,
  variant = 'blue',
  className = '',
}: StatCardProps) => {
  return (
    <div
      className={cn(
        'text-center p-4 rounded-lg',
        variantStyles[variant],
        className
      )}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
};
