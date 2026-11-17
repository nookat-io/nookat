import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
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

  // Subscribe to engine state updates, start the backend monitor, then pull the
  // current snapshot.
  //
  // The monitor only emits when the engine state changes, and it keeps running
  // across webview reloads. A remounted provider (a reload, or a Vite full
  // reload in dev) would otherwise sit without data until the next Docker change
  // and then time out. The listener goes in first so no push can slip between
  // the pull and the subscription.
  useEffect(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | undefined;
    // The monitor publishes pushed and pulled snapshots in the order it read
    // them, each one version higher than the last. A pull can still resolve
    // after a newer push, so anything not newer than the last applied snapshot
    // is stale and changes nothing.
    let appliedVersion = 0;

    const applySnapshot = (snapshot: EngineState) => {
      if (cancelled || !mountedRef.current) return;
      if (snapshot.version <= appliedVersion) return;
      appliedVersion = snapshot.version;

      setEngineState(snapshot);
      setError(null);
      setIsLoading(false);

      if (snapshot.engine_status) {
        setEngineStatus(snapshot.engine_status);
      }

      // Stop status polling once we have live updates
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const subscribe = async () => {
      const stopListening = await listen<EngineState>(
        'engine_state_update',
        event => applySnapshot(event.payload)
      );
      if (cancelled) {
        stopListening();
        return;
      }
      unlisten = stopListening;

      try {
        await invoke('start_engine_state_monitoring');
      } catch (err) {
        console.error('Failed to start engine state monitoring:', err);
        if (!cancelled) {
          setError('Failed to start engine state monitoring');
          setIsLoading(false);
        }
        return;
      }

      try {
        applySnapshot(await invoke<EngineState>('get_engine_state'));
      } catch (err) {
        // A failed read, such as the engine going away mid-read. The monitor
        // keeps publishing on its own, so the next push fills in.
        console.warn('Engine state snapshot unavailable:', err);
      }
    };

    subscribe();

    return () => {
      cancelled = true;
      unlisten?.();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TECH-005
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
