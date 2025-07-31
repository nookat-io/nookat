import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface VolumeData {
  name: string;
  driver: string;
  mountpoint: string;
  created_at?: string;
  status?: Record<string, Record<string, string>>;
  labels: Record<string, string>;
  scope?: 'EMPTY' | 'LOCAL' | 'GLOBAL';
  options: Record<string, string>;
  usage_data?: {
    size: number;
    ref_count: number;
  };
}

interface VolumeDataProviderProps {
  children: (props: {
    volumes: VolumeData[];
    isLoading: boolean;
    error: string | null;
    refreshVolumes: () => Promise<void>;
  }) => React.ReactNode;
}

const AUTO_REFRESH_INTERVAL = 1000; // 1 second for responsive updates

export function VolumeDataProvider({ children }: VolumeDataProviderProps) {
  const [volumes, setVolumes] = useState<VolumeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastRefreshTime = useRef<number>(Date.now());
  const autoRefreshInterval = useRef<number | null>(null);

  async function getVolumes(silent = false) {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      const result = await invoke<VolumeData[]>('list_volumes');
      setVolumes(result);
      lastRefreshTime.current = Date.now();
      console.log(result);
    } catch (error) {
      console.error('Error getting volumes:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch volumes'
      );
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }

  async function refreshVolumes() {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<VolumeData[]>('list_volumes');
      setVolumes(result);
      lastRefreshTime.current = Date.now();
      console.log(result);
    } catch (error) {
      console.error('Error getting volumes:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch volumes'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const startAutoRefresh = () => {
      autoRefreshInterval.current = setInterval(() => {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
        if (timeSinceLastRefresh > AUTO_REFRESH_INTERVAL) {
          // Silent refresh - don't show loading state
          getVolumes(true);
        }
      }, AUTO_REFRESH_INTERVAL);
    };

    // Initial load
    getVolumes();

    // Start auto-refresh
    startAutoRefresh();

    // Cleanup on unmount
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  return (
    <>
      {children({
        volumes,
        isLoading: isInitialLoad || isLoading,
        error,
        refreshVolumes,
      })}
    </>
  );
}
