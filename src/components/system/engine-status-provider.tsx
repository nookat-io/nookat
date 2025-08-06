import { useEffect, useMemo, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ErrorDisplay } from '../ui/error-display';
import type { ReactNode } from 'react';
import { EngineStatusContext } from '../../hooks/useEngineStatus';
import { EngineState, EngineStatus } from '../../types/engine-status';

export type EngineContextValue = EngineStatus;

interface ProviderProps {
  children: ReactNode;
}

export function EngineStatusProvider({ children }: ProviderProps) {
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState>(
    EngineState.NotRunning
  );

  const fetchEngineInfo = useCallback(async () => {
    setError(null);
    try {
      const { state } = await invoke<EngineStatus>('engine_status');
      setEngineState(state);

      console.log(state);

      if (state !== EngineState.Healthy) {
        setVersion(null);
        if (state === EngineState.NotInstalled) {
          setError('Docker Engine could not be detected on your computer.');
        }
        return;
      }

      // looks healthy, get info to get version and to confirm connectivity
      try {
        const { server_version } = await invoke<{ server_version: string }>(
          'get_docker_info'
        );
        setVersion(server_version);
      } catch {
        setVersion(null);
        setError('Could not communicate with Docker Engine.');
      }
    } catch (e) {
      // shouldn't hit here
      setVersion(null);
      setError(String((e as Error).message));
    }
  }, []);

  useEffect(() => {
    fetchEngineInfo();
  }, [fetchEngineInfo]);

  const value = useMemo<EngineContextValue>(() => {
    const base: EngineContextValue = { state: engineState };
    if (engineState === EngineState.Healthy && version !== null) {
      base.version = version;
    }
    if (error) {
      base.error = error;
    }
    return base;
  }, [engineState, version, error]);

  if (error) {
    return <ErrorDisplay fullScreen error={error} onRetry={fetchEngineInfo} />;
  }

  return (
    <EngineStatusContext.Provider value={value}>
      {children}
    </EngineStatusContext.Provider>
  );
}
