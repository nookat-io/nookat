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
  const [engineName, setEngineName] = useState<string>('Docker Engine'); // TODO: engineName will be renamed to engineName in follow-up PR
  // ref to track mounted state so async fetch can avoid updating after unmount
  const mountedRef = useRef(true);

  const fetchEngineInfo = useCallback(async () => {
    if (!mountedRef.current) return;
    setError(null);
    try {
      const {
        state,
        name: engineName,
        version: engineVersion,
        error: statusError,
      } = await invoke<EngineStatus>('engine_status');
      if (!mountedRef.current) return;
      setEngineState(state);
      if (state !== EngineState.Healthy) {
        if (!mountedRef.current) return;
        setVersion(null);
        if (state === EngineState.NotInstalled) {
          setError('Container Engine could not be detected on your computer.');
        } else if (state === EngineState.Malfunctioning) {
          setError(statusError ?? 'Container Engine error');
        }
        return;
      }

      // Set all state fields for healthy engine state
      if (engineName != null) {
        setEngineName(engineName);
      }
      if (engineVersion != null) {
        setVersion(engineVersion);
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
      name: engineName,
      state: engineState,
      refetch: fetchEngineInfo,
    };
    if (engineState === EngineState.Healthy && version !== null) {
      base.version = version;
    }
    if (error) {
      base.error = error;
    }
    return base;
  }, [engineState, version, error, fetchEngineInfo, engineName]);

  return (
    <EngineStatusContext.Provider value={value}>
      {children}
    </EngineStatusContext.Provider>
  );
}
