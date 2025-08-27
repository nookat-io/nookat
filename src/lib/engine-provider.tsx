import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { EngineState } from '../types/engine-state';
import { EngineStatus } from '../types/engine-status';
import { Container } from '../components/containers/container-types';
import { Image } from '../components/images/image-types';
import { Volume } from '../components/volumes/volume-types';
import { Network } from '../components/networks/network-types';

interface EngineContext {
  // Engine status related
  status: EngineStatus;
  refetch: () => Promise<void>;
  isChecking: boolean;

  // Engine state related
  engineState: EngineState | null;
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  updateContainer: (id: string, container: Container) => void;
  updateImage: (id: string, image: Image) => void;
  updateVolume: (name: string, volume: Volume) => void;
  updateNetwork: (name: string, network: Network) => void;
  removeContainer: (id: string) => void;
  removeImage: (id: string) => void;
  removeVolume: (name: string) => void;
  removeNetwork: (name: string) => void;
}

const EngineContext = createContext<EngineContext | undefined>(undefined);

// Export the context for use in the hook
export { EngineContext };

interface EngineProviderProps {
  children: ReactNode;
}

export function EngineProvider({ children }: EngineProviderProps) {
  // Engine status state
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('Unknown');
  const [isChecking, setIsChecking] = useState(false);

  // Engine state
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ref to track mounted state so async fetch can avoid updating after unmount
  const mountedRef = useRef(true);
  // ref to track the interval ID for cleanup
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEngineInfo = useCallback(async (showLoading = false) => {
    if (!mountedRef.current) return;

    if (showLoading) {
      setIsChecking(true);
    }

    try {
      const backendStatus = await invoke<EngineStatus>('engine_status');
      if (!mountedRef.current) return;

      // Validate that we received a valid status
      if (!backendStatus) {
        setEngineStatus('Unknown');
        return;
      }

      // Check if it's a string (Unknown) or an object (Installed/Running)
      if (typeof backendStatus === 'string') {
        if (backendStatus !== 'Unknown') {
          setEngineStatus('Unknown');
          return;
        }
      } else if (typeof backendStatus === 'object') {
        // Should have either Installed or Running key
        if (!('Installed' in backendStatus) && !('Running' in backendStatus)) {
          setEngineStatus('Unknown');
          return;
        }
      } else {
        setEngineStatus('Unknown');
        return;
      }

      // If the status is "Running", actively test the connection to ensure it's still reachable
      if (typeof backendStatus === 'object' && 'Running' in backendStatus) {
        try {
          // Test the actual connection by calling get_docker_info
          // This will fail if the Docker daemon becomes unavailable
          await invoke('get_docker_info');
        } catch {
          // If the connection test fails, the engine is no longer reachable
          setEngineStatus('Unknown');
          return;
        }
      }

      setEngineStatus(backendStatus);
    } catch {
      if (!mountedRef.current) return;
      // When there's an error, set status to Unknown
      setEngineStatus('Unknown');
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  }, []);

  // Manual refresh function for user-initiated status checks
  const manualRefresh = useCallback(async () => {
    await fetchEngineInfo(true); // Show loading state for manual refresh
  }, [fetchEngineInfo]);

  // Start engine state monitoring when component mounts
  useEffect(() => {
    const startMonitoring = async () => {
      try {
        // Start the engine state monitoring
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

        // Update engine status from the state update if available
        if (engineStateData.engine_status) {
          setEngineStatus(engineStateData.engine_status);
        }
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

  // Engine status polling effect
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchEngineInfo(true);

    // Check status every second
    intervalRef.current = setInterval(() => {
      fetchEngineInfo(false);
    }, 1000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchEngineInfo]);

  // CRUD operations
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

  const contextValue: EngineContext = {
    // Engine status
    status: engineStatus,
    refetch: manualRefresh,
    isChecking,

    // Engine state
    engineState,
    isLoading,
    error,

    // CRUD operations
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
    <EngineContext.Provider value={contextValue}>
      {children}
    </EngineContext.Provider>
  );
}
