import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Port {
  ip?: string;
  private_port: number;
  public_port?: number;
  port_type?: 'tcp' | 'udp' | 'sctp';
}

export interface ContainerData {
  id: string;
  names: string[];
  image: string;
  state:
    | 'running'
    | 'stopped'
    | 'paused'
    | 'restarting'
    | 'created'
    | 'exited'
    | 'removing'
    | 'dead';
  created: number;
  ports: Port[];
  size: string;
  labels: Record<string, string>;
}

interface ContainerDataProviderProps {
  children: (props: {
    containers: ContainerData[];
    isLoading: boolean;
    error: string | null;
    refreshContainers: () => Promise<void>;
  }) => React.ReactNode;
}

const AUTO_REFRESH_INTERVAL = 500;

export function ContainerDataProvider({
  children,
}: ContainerDataProviderProps) {
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshTime = useRef<number>(Date.now());
  const autoRefreshInterval = useRef<number | null>(null);

  async function getContainers() {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<ContainerData[]>('list_containers');
      setContainers(result);
      lastRefreshTime.current = Date.now();
      console.log(result);
    } catch (error) {
      console.error('Error getting containers:', error);
      setError('Failed to fetch containers');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const startAutoRefresh = () => {
      autoRefreshInterval.current = setInterval(() => {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
        if (timeSinceLastRefresh > AUTO_REFRESH_INTERVAL) {
          getContainers();
        }
      }, AUTO_REFRESH_INTERVAL);
    };

    // Initial load
    getContainers();

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
        containers,
        isLoading,
        error,
        refreshContainers: getContainers,
      })}
    </>
  );
}
