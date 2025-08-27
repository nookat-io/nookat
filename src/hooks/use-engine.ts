import { useContext } from 'react';
import { EngineContext } from '../lib/engine-provider';

export function useEngine() {
  const context = useContext(EngineContext);
  if (context === undefined) {
    throw new Error('useEngine must be used within an EngineProvider');
  }
  return context;
}
