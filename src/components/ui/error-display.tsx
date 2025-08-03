import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  className?: string;
  fullScreen?: boolean;
  showRetry?: boolean;
}

export function ErrorDisplay({
  error,
  onRetry,
  className,
  fullScreen = false,
  showRetry = true,
}: ErrorDisplayProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4',
        className
      )}
    >
      <div className="flex items-center space-x-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span className="font-medium">Error</span>
      </div>
      <p className="text-muted-foreground text-sm text-center max-w-md">
        {error}
      </p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </button>
      )}
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
