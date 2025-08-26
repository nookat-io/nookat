import { useContext } from 'react';
import { EngineStateContext } from '../lib/engine-state-provider';

export function useEngineState() {
  const context = useContext(EngineStateContext);
  if (context === undefined) {
    throw new Error(
      'useEngineState must be used within an EngineStateProvider'
    );
  }
  return context;
}
