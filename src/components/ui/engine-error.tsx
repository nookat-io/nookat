import React from 'react';
import { ErrorDisplay } from './error-display';
import { useEngineStatus } from '../../hooks/use-engine-status';

interface Props {
  children: React.ReactNode;
}

export default function EngineErrorGate({ children }: Props): React.ReactNode {
  const { status, refetch, isChecking } = useEngineStatus();

  // Check if there's an engine-level error
  const shouldShowError = status === 'Unknown';

  if (shouldShowError) {
    const message = isChecking
      ? 'Checking engine status...'
      : 'Engine status is unknown';

    return (
      <div
        className="p-6 h-full flex items-center justify-center"
        role="alert"
        aria-live="assertive"
      >
        <ErrorDisplay
          error={message}
          onRetry={() => refetch()}
          fullScreen={false}
        />
      </div>
    );
  }

  return <>{children}</>;
}
