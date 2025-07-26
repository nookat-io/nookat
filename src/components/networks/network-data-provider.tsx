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

const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

export function NetworkDataProvider({ children }: NetworkDataProviderProps) {
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRefreshInterval = useRef<number | null>(null);

  async function getNetworks() {
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
      getNetworks();
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
        isLoading,
        error,
        refreshNetworks: getNetworks,
      })}
    </>
  );
}
