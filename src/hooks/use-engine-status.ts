import { useContext } from 'react';
import { EngineContext } from '../lib/engine-provider';
import type { EngineContextValue } from '../types/engine-status';

export function useEngineStatus(): EngineContextValue {
  const ctx = useContext(EngineContext);
  if (!ctx) {
    throw new Error('useEngineStatus must be inside EngineProvider');
  }
  return {
    status: ctx.status,
    refetch: ctx.refetch,
    isChecking: ctx.isChecking,
  };
}
