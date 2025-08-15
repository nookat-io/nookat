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
  const [isChecking, setIsChecking] = useState(false);
  // ref to track mounted state so async fetch can avoid updating after unmount
  const mountedRef = useRef(true);
  // ref to track the interval ID for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const value = useMemo<EngineContextValue>(
    () => ({
      status: engineStatus,
      refetch: manualRefresh,
      isChecking,
    }),
    [engineStatus, manualRefresh, isChecking]
  );

  return (
    <EngineStatusContext.Provider value={value}>
      {children}
    </EngineStatusContext.Provider>
  );
}
