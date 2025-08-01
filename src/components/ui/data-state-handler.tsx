import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';

interface DataStateHandlerProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingMessage?: string;
  loadingSize?: 'sm' | 'md' | 'lg';
  errorShowRetry?: boolean;
  className?: string;
}

export function DataStateHandler({
  isLoading,
  error,
  onRetry,
  children,
  loadingMessage = 'Loading...',
  loadingSize = 'md',
  errorShowRetry = true,
  className,
}: DataStateHandlerProps) {
  if (isLoading) {
    return (
      <LoadingSpinner
        message={loadingMessage}
        size={loadingSize}
        className={className}
      />
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={onRetry}
        showRetry={errorShowRetry}
        className={className}
      />
    );
  }

  return <>{children}</>;
}
