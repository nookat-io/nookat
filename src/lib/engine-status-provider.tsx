import { useEffect, useMemo, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ReactNode } from 'react';
import { EngineStatusContext } from '../hooks/use-engine-status';
import {
  EngineState,
  EngineStatus,
  EngineContextValue,
} from '../types/engine-status';

interface ProviderProps {
  children: ReactNode;
}

export function EngineStatusProvider({ children }: ProviderProps) {
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState>(
    EngineState.Loading
  );

  const fetchEngineInfo = useCallback(async () => {
    setError(null);
    try {
      const {
        state,
        version: statusVersion,
        error: statusError,
      } = await invoke<EngineStatus>('engine_status');
      setEngineState(state);
      if (state !== EngineState.Healthy) {
        setVersion(null);
        if (state === EngineState.NotInstalled) {
          setError('Docker Engine could not be detected on your computer.');
        } else if (state === EngineState.Malfunctioning && statusError) {
          setError(statusError);
        }
        return;
      }
      // fallback to info if missing
      if (statusVersion != null) {
        setVersion(statusVersion);
        return;
      }
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
      setEngineState(EngineState.Malfunctioning);
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

  return (
    <EngineStatusContext.Provider value={value}>
      {children}
    </EngineStatusContext.Provider>
  );
}
