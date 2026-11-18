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
  status: EngineStatus;
  refetch: () => Promise<void>;
  isChecking: boolean;

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

const EngineContext = createContext<EngineContext | undefined>(undefined);

export { EngineContext };

interface EngineProviderProps {
  children: ReactNode;
}

const STATUS_POLL_INTERVAL_MS = 1000;
const FIRST_SNAPSHOT_TIMEOUT_MS = 15_000;

function isEngineStatus(value: unknown): value is EngineStatus {
  if (value === 'Unknown') {
    return true;
  }
  return (
    typeof value === 'object' &&
    value !== null &&
    ('Installed' in value || 'Running' in value)
  );
}

async function isDaemonReachable() {
  try {
    await invoke('get_docker_info');
    return true;
  } catch {
    return false;
  }
}

async function readEngineStatus(): Promise<EngineStatus> {
  try {
    const reported = await invoke<unknown>('engine_status');
    if (!isEngineStatus(reported)) {
      return 'Unknown';
    }
    const claimsRunning = typeof reported === 'object' && 'Running' in reported;
    if (claimsRunning && !(await isDaemonReachable())) {
      return 'Unknown';
    }
    return reported;
  } catch {
    return 'Unknown';
  }
}

export function EngineProvider({ children }: EngineProviderProps) {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('Unknown');
  const [isChecking, setIsChecking] = useState(true);

  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshEngineStatus = useCallback(
    () =>
      readEngineStatus().then(status => {
        if (!mountedRef.current) return;
        setEngineStatus(status);
        setIsChecking(false);
      }),
    []
  );

  const manualRefresh = useCallback(async () => {
    setIsChecking(true);
    await refreshEngineStatus();
  }, [refreshEngineStatus]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | undefined;
    let newestAppliedVersion = 0;

    const applySnapshot = (snapshot: EngineState) => {
      if (cancelled || !mountedRef.current) return;
      const isStale = snapshot.version <= newestAppliedVersion;
      if (isStale) return;
      newestAppliedVersion = snapshot.version;

      setEngineState(snapshot);
      setError(null);
      setIsLoading(false);

      if (snapshot.engine_status) {
        setEngineStatus(snapshot.engine_status);
      }

      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    };

    const listenThenStartMonitorThenPullSnapshot = async () => {
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
        console.warn('Engine state snapshot unavailable:', err);
      }
    };

    listenThenStartMonitorThenPullSnapshot();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && !engineState) {
        setIsLoading(false);
        setError('No engine state received from monitoring service');
      }
    }, FIRST_SNAPSHOT_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isLoading, engineState]);

  useEffect(() => {
    mountedRef.current = true;

    refreshEngineStatus();
    statusPollRef.current = setInterval(
      refreshEngineStatus,
      STATUS_POLL_INTERVAL_MS
    );

    return () => {
      mountedRef.current = false;
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
      }
    };
  }, [refreshEngineStatus]);

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
    status: engineStatus,
    refetch: manualRefresh,
    isChecking,

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
    <EngineContext.Provider value={contextValue}>
      {children}
    </EngineContext.Provider>
  );
}
