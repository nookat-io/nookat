import {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { EngineState } from '../types/engine-state';
import { Container } from '../components/containers/container-types';
import { Image } from '../components/images/image-types';
import { Volume } from '../components/volumes/volume-types';
import { Network } from '../components/networks/network-types';

interface EngineStateContext {
  engineState: EngineState | null;
  isLoading: boolean;
  error: string | null;
  updateContainer: (id: string, container: Container) => void;
  updateImage: (id: string, image: Image) => void;
  updateVolume: (name: string, volume: Volume) => void;
  updateNetwork: (name: string, network: Network) => void;
  removeContainer: (id: string) => void;
  removeImage: (id: string) => void;
  removeVolume: (name: string) => void;
  removeNetwork: (name: string) => void;
}

const EngineStateContext = createContext<EngineStateContext | undefined>(
  undefined
);

// Export the context for use in the hook
export { EngineStateContext };

interface EngineStateProviderProps {
  children: ReactNode;
}

export function EngineStateProvider({ children }: EngineStateProviderProps) {
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start engine state monitoring when component mounts
  useEffect(() => {
    const startMonitoring = async () => {
      try {
        // Start the WebSocket server and engine state monitoring
        await invoke('start_websocket_timestamp_service', { port: 8080 });
        await invoke('start_engine_state_monitoring');
        console.log('Engine state monitoring started');
      } catch (err) {
        console.error('Failed to start engine state monitoring:', err);
        setError('Failed to start engine state monitoring');
        setIsLoading(false);
      }
    };

    startMonitoring();
  }, []);

  // Listen for engine state updates via Tauri events
  useEffect(() => {
    const unlisten = listen('engine_state_update', event => {
      try {
        const engineStateData = event.payload as EngineState;
        setEngineState(engineStateData);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error parsing engine state update:', err);
        setError('Failed to parse engine state update');
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // Set loading to false after a timeout if no updates received
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && !engineState) {
        setIsLoading(false);
        setError('No engine state received from monitoring service');
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading, engineState]);

  // Remove the manual fetch - we now rely entirely on Tauri events
  // The initial state will be received via events when the monitoring starts

  const updateContainer = useCallback((id: string, container: Container) => {
    setEngineState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        containers: {
          ...prev.containers,
          [id]: container,
        },
      };
    });
  }, []);

  const updateImage = useCallback((id: string, image: Image) => {
    setEngineState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        images: {
          ...prev.images,
          [id]: image,
        },
      };
    });
  }, []);

  const updateVolume = useCallback((name: string, volume: Volume) => {
    setEngineState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        volumes: {
          ...prev.volumes,
          [name]: volume,
        },
      };
    });
  }, []);

  const updateNetwork = useCallback((name: string, network: Network) => {
    setEngineState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        networks: {
          ...prev.networks,
          [name]: network,
        },
      };
    });
  }, []);

  const removeContainer = useCallback((id: string) => {
    setEngineState(prev => {
      if (!prev) return prev;
      const containers = { ...prev.containers };
      delete containers[id];
      return {
        ...prev,
        containers,
      };
    });
  }, []);

  const removeImage = useCallback((id: string) => {
    setEngineState(prev => {
      if (!prev) return prev;
      const images = { ...prev.images };
      delete images[id];
      return {
        ...prev,
        images,
      };
    });
  }, []);

  const removeVolume = useCallback((name: string) => {
    setEngineState(prev => {
      if (!prev) return prev;
      const volumes = { ...prev.volumes };
      delete volumes[name];
      return {
        ...prev,
        volumes,
      };
    });
  }, []);

  const removeNetwork = useCallback((name: string) => {
    setEngineState(prev => {
      if (!prev) return prev;
      const networks = { ...prev.networks };
      delete networks[name];
      return {
        ...prev,
        networks,
      };
    });
  }, []);

  const contextValue: EngineStateContext = {
    engineState,
    isLoading,
    error,
    updateContainer,
    updateImage,
    updateVolume,
    updateNetwork,
    removeContainer,
    removeImage,
    removeVolume,
    removeNetwork,
  };

  return (
    <EngineStateContext.Provider value={contextValue}>
      {children}
    </EngineStateContext.Provider>
  );
}
