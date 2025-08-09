import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  // ref to track mounted state so async fetch can avoid updating after unmount
  const mountedRef = useRef(true);

  const fetchEngineInfo = useCallback(async () => {
    if (!mountedRef.current) return;
    setError(null);
    try {
      const {
        state,
        version: statusVersion,
        error: statusError,
      } = await invoke<EngineStatus>('engine_status');
      if (!mountedRef.current) return;
      setEngineState(state);
      if (state !== EngineState.Healthy) {
        if (!mountedRef.current) return;
        setVersion(null);
        if (state === EngineState.NotInstalled) {
          setError('Docker Engine could not be detected on your computer.');
        } else if (state === EngineState.Malfunctioning) {
          setError(statusError ?? 'Docker Engine error');
        }
        return;
      }
      // fallback to info if missing
      if (statusVersion != null) {
        if (!mountedRef.current) return;
        setVersion(statusVersion);
        return;
      }
      try {
        const { server_version } = await invoke<{ server_version: string }>(
          'get_docker_info'
        );
        if (!mountedRef.current) return;
        setVersion(server_version);
      } catch {
        if (!mountedRef.current) return;
        setVersion(null);
        setError('Could not communicate with Docker Engine.');
      }
    } catch (e) {
      // shouldn't hit here
      if (!mountedRef.current) return;
      setVersion(null);
      setEngineState(EngineState.Malfunctioning);
      setError(String((e as Error).message));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true; // set ref to track mounted state for async fetch
    fetchEngineInfo();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchEngineInfo]);

  const value = useMemo<EngineContextValue>(() => {
    const base: EngineContextValue = {
      state: engineState,
      refetch: fetchEngineInfo,
    };
    if (engineState === EngineState.Healthy && version !== null) {
      base.version = version;
    }
    if (error) {
      base.error = error;
    }
    base.refetch = fetchEngineInfo;
    return base;
  }, [engineState, version, error, fetchEngineInfo]);

  return (
    <EngineStatusContext.Provider value={value}>
      {children}
    </EngineStatusContext.Provider>
  );
}
