import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ReactNode } from 'react';
import { EngineStatusContext } from '../hooks/use-engine-status';
import { EngineStatus, EngineContextValue } from '../types/engine-status';

interface ProviderProps {
  children: ReactNode;
}

export function EngineStatusProvider({ children }: ProviderProps) {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('Unknown');
  // ref to track mounted state so async fetch can avoid updating after unmount
  const mountedRef = useRef(true);

  const fetchEngineInfo = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const backendStatus = await invoke<EngineStatus>('engine_status');
      if (!mountedRef.current) return;

      console.log('Backend engine status response:', backendStatus);
      console.log('Backend status type:', typeof backendStatus);
      console.log(
        'Backend status keys:',
        backendStatus ? Object.keys(backendStatus) : 'null/undefined'
      );

      // Validate that we received a valid status
      if (!backendStatus) {
        console.error('Null/undefined engine status response:', backendStatus);
        setEngineStatus('Unknown');
        return;
      }

      // Check if it's a string (Unknown) or an object (Installed/Running)
      if (typeof backendStatus === 'string') {
        if (backendStatus !== 'Unknown') {
          console.error('Unexpected string engine status:', backendStatus);
          setEngineStatus('Unknown');
          return;
        }
      } else if (typeof backendStatus === 'object') {
        // Should have either Installed or Running key
        if (!('Installed' in backendStatus) && !('Running' in backendStatus)) {
          console.error(
            'Invalid engine status object structure:',
            backendStatus
          );
          setEngineStatus('Unknown');
          return;
        }
      } else {
        console.error(
          'Unexpected engine status type:',
          typeof backendStatus,
          backendStatus
        );
        setEngineStatus('Unknown');
        return;
      }

      setEngineStatus(backendStatus);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Error fetching engine status:', e);
      setEngineStatus('Unknown');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true; // set ref to track mounted state for async fetch
    fetchEngineInfo();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchEngineInfo]);

  const value = useMemo<EngineContextValue>(
    () => ({
      status: engineStatus,
      refetch: fetchEngineInfo,
    }),
    [engineStatus, fetchEngineInfo]
  );

  console.log('Engine status context value:', value);

  return (
    <EngineStatusContext.Provider value={value}>
      {children}
    </EngineStatusContext.Provider>
  );
}
