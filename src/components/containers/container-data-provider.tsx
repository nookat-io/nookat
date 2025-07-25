import { useState, useEffect, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";

export interface ContainerPort {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: string;
}

export interface ContainerData {
  id: string;
  names: string[];
  image: string;
  state: 'running' | 'stopped' | 'paused' | 'restarting' | 'created' | 'exited' | 'removing' | 'dead';
  created: number;
  ports: ContainerPort[];
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

// Reduced refresh interval to prevent performance issues
const AUTO_REFRESH_INTERVAL = 2000; // 2 seconds instead of 500ms

export function ContainerDataProvider({ children }: ContainerDataProviderProps) {
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshTime = useRef<number>(Date.now());
  const autoRefreshInterval = useRef<number | null>(null);

  async function getContainers() {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<ContainerData[]>("list_containers");
      setContainers(result);
      lastRefreshTime.current = Date.now();
      console.log(result);
    } catch (error) {
      console.error("Error getting containers:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch containers");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let intervalId: number | null = null;

    const startAutoRefresh = () => {
      intervalId = setInterval(() => {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
        if (timeSinceLastRefresh > AUTO_REFRESH_INTERVAL) {
          getContainers();
        }
      }, AUTO_REFRESH_INTERVAL);
      
      autoRefreshInterval.current = intervalId;
    };

    // Initial load
    getContainers();
    
    // Start auto-refresh
    startAutoRefresh();

    // Cleanup on unmount - ensure proper cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
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