import { useContext } from 'react';
import { EngineContext } from '../lib/engine-provider';

export function useEngineState() {
  const context = useContext(EngineContext);
  if (context === undefined) {
    throw new Error('useEngineState must be used within an EngineProvider');
  }
  return {
    engineState: context.engineState,
    isLoading: context.isLoading,
    error: context.error,
    updateContainer: context.updateContainer,
    updateImage: context.updateImage,
    updateVolume: context.updateVolume,
    updateNetwork: context.updateNetwork,
    removeContainer: context.removeContainer,
    removeImage: context.removeImage,
    removeVolume: context.removeVolume,
    removeNetwork: context.removeNetwork,
  };
}
