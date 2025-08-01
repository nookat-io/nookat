import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';

interface PageWrapperProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingMessage?: string;
  fullScreenLoading?: boolean;
  fullScreenError?: boolean;
}

export function PageWrapper({
  isLoading,
  error,
  onRetry,
  children,
  loadingMessage,
  fullScreenLoading = false,
  fullScreenError = false,
}: PageWrapperProps) {
  if (isLoading) {
    return (
      <LoadingSpinner message={loadingMessage} fullScreen={fullScreenLoading} />
    );
  }

  if (error && fullScreenError) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={onRetry}
        fullScreen={fullScreenError}
      />
    );
  }

  return <>{children}</>;
}
