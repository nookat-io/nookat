import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface NetworkData {
  id: string;
  name: string;
  driver: string;
  scope: string;
  created?: string;
  subnet?: string;
  gateway?: string;
  containers: number;
  internal: boolean;
  ipam: {
    driver?: string;
    config?: Array<{
      subnet?: string;
      gateway?: string;
    }>;
  };
  labels?: Record<string, string>;
}

interface NetworkDataProviderProps {
  children: (props: {
    networks: NetworkData[];
    isLoading: boolean;
    error: string | null;
    refreshNetworks: () => Promise<void>;
  }) => React.ReactNode;
}

const AUTO_REFRESH_INTERVAL = 1000; // 1 second for responsive updates

export function NetworkDataProvider({ children }: NetworkDataProviderProps) {
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const autoRefreshInterval = useRef<number | null>(null);

  async function getNetworks(silent = false) {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      const result = await invoke<NetworkData[]>('list_networks');

      // Validate the result
      if (!Array.isArray(result)) {
        throw new Error('Invalid response format from server');
      }

      setNetworks(result);
    } catch (error) {
      console.error('Error getting networks:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch networks'
      );
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }

  async function refreshNetworks() {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<NetworkData[]>('list_networks');

      // Validate the result
      if (!Array.isArray(result)) {
        throw new Error('Invalid response format from server');
      }

      setNetworks(result);
    } catch (error) {
      console.error('Error getting networks:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch networks'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    getNetworks(); // Initial load
    autoRefreshInterval.current = window.setInterval(() => {
      // Silent refresh - don't show loading state
      getNetworks(true);
    }, AUTO_REFRESH_INTERVAL);
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []); // getNetworks is stable, no dependencies needed

  return (
    <>
      {children({
        networks: networks || [],
        isLoading: isInitialLoad || isLoading,
        error,
        refreshNetworks,
      })}
    </>
  );
}
