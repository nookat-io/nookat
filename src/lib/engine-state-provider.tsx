import {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { EngineState } from '../types/engine-state';
import { Container } from '../components/containers/container-types';
import { Image } from '../components/images/image-types';
import { Volume } from '../components/volumes/volume-types';
import { Network } from '../components/networks/network-types';
import { useWebSocket } from '../hooks/use-websocket';

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

  const fetchEngineState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<EngineState>('get_engine_state');
      setEngineState(result);
    } catch (err) {
      console.error('Error fetching engine state:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch engine state'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // WebSocket connection for real-time updates
  const { connection } = useWebSocket({
    url: 'ws://localhost:8080',
    autoConnect: true,
    onMessage: message => {
      if (message.message_type === 'engine_state_update') {
        try {
          const engineStateData = message.payload as unknown as EngineState;
          setEngineState(engineStateData);
          setError(null);
        } catch (err) {
          console.error('Error parsing engine state update:', err);
        }
      }
    },
    onError: error => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
    },
  });

  // Start engine state monitoring when WebSocket connects
  useEffect(() => {
    if (connection.status === 'connected') {
      invoke('start_engine_state_monitoring').catch(err => {
        console.error('Failed to start engine state monitoring:', err);
      });
    }
  }, [connection.status]);

  // Initial fetch on mount
  useEffect(() => {
    fetchEngineState();
  }, [fetchEngineState]);

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
