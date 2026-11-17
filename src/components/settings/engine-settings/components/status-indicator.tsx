import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'loading' | 'available' | 'unavailable';
  title: string;
  description: string;
  className?: string;
}

export const StatusIndicator = ({
  status,
  title,
  description,
  className = '',
}: StatusIndicatorProps) => {
  const getStatusContent = () => {
    switch (status) {
      case 'loading':
        return {
          icon: Loader2,
          iconClass: 'animate-spin text-muted-foreground',
        };
      case 'available':
        return {
          icon: CheckCircle,
          iconClass: 'text-blue-600 dark:text-blue-400',
        };
      case 'unavailable':
        return {
          icon: AlertTriangle,
          iconClass: 'text-amber-600 dark:text-amber-400',
        };
    }
  };

  const { icon: Icon, iconClass } = getStatusContent();

  return (
    <div
      className={`flex items-center justify-between p-4 bg-muted/50 rounded-lg ${className}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${iconClass}`} />
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
    </div>
  );
};
