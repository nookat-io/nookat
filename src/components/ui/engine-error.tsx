'use client';

import React from 'react';
import { ErrorDisplay } from './error-display';
import { useEngineStatus } from '../../hooks/use-engine-status';
import { EngineState } from '../../types/engine-status';

interface Props {
  children: React.ReactNode;
}

export default function EngineErrorGate({ children }: Props): React.ReactNode {
  const { state, error, refetch } = useEngineStatus();
  // If there's an engine-level error
  if (
    error ||
    state === EngineState.NotInstalled ||
    state === EngineState.Malfunctioning
  ) {
    const message =
      error ??
      (state === EngineState.NotInstalled
        ? 'Docker Engine is not installed'
        : 'Docker Engine error');
    return (
      <div className="p-6" role="alert" aria-live="assertive">
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
