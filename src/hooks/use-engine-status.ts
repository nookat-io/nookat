import { createContext, useContext } from 'react';
import type { EngineContextValue } from '../types/engine-status';

export const EngineStatusContext = createContext<
  EngineContextValue | undefined
>(undefined);

export function useEngineStatus() {
  const ctx = useContext(EngineStatusContext);
  if (!ctx) {
    throw new Error('useEngineStatus must be inside EngineStatusProvider');
  }
  return ctx;
}
