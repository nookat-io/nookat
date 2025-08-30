interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
  'data-testid'?: string;
}

export function LoadingSpinner({
  size = 'md',
  className = '',
  message,
  'data-testid': dataTestId,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      data-testid={dataTestId}
    >
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary ${sizeClasses[size]} mb-2`}
      />
      {message !== undefined && (
        <p className="text-muted-foreground text-sm">{message}</p>
      )}
    </div>
  );
}

export function LoadingScreen({
  'data-testid': dataTestId,
}: {
  'data-testid'?: string;
}) {
  return (
    <div
      className="fixed inset-0 bg-background flex items-center justify-center"
      data-testid={dataTestId}
    >
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-muted-foreground">Loading configuration...</p>
      </div>
    </div>
  );
}
