import { LucideIcon } from 'lucide-react';

interface InfoBannerProps {
  icon: LucideIcon;
  title: string;
  message: string;
  variant?: 'info' | 'warning' | 'success' | 'error';
  className?: string;
}

const variantStyles = {
  info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  warning:
    'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  success:
    'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error:
    'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
};

export const InfoBanner = ({
  icon: Icon,
  title,
  message,
  variant = 'info',
  className = '',
}: InfoBannerProps) => {
  return (
    <div
      className={`p-4 border rounded-lg ${variantStyles[variant]} ${className}`}
    >
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-sm mt-1">{message}</p>
    </div>
  );
};
