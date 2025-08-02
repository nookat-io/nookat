import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  message = 'Loading...',
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4',
        className
      )}
    >
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="page-background min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
