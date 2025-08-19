import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Container } from '../components/containers/container-types';
import { Image } from '../components/images/image-types';
import { Network } from '../components/networks/network-types';
import { Volume } from '../components/volumes/volume-types';

export interface DataProviderState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDataProvider<T>(
  command: string,
  autoRefreshInterval = 1000
): DataProviderState<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastRefreshTime = useRef<number>(Date.now());
  const autoRefreshIntervalRef = useRef<number | null>(null);

  async function fetchData(silent = false) {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      const result = await invoke<T[]>(command);
      setData(result);
      lastRefreshTime.current = Date.now();
    } catch (error) {
      console.error(`Error fetching data for ${command}:`, error);
      setError(`Failed to fetch data`);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }

  async function refresh() {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<T[]>(command);
      setData(result);
      lastRefreshTime.current = Date.now();
    } catch (error) {
      console.error(`Error refreshing data for ${command}:`, error);
      setError(`Failed to refresh data`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const startAutoRefresh = () => {
      // @ts-expect-error - setInterval is a valid function
      autoRefreshIntervalRef.current = setInterval(() => {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
        if (timeSinceLastRefresh > autoRefreshInterval) {
          fetchData(true);
        }
      }, autoRefreshInterval);
    };

    fetchData();
    startAutoRefresh();

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [command, autoRefreshInterval]);

  return {
    data,
    isLoading: isInitialLoad || isLoading,
    error,
    refresh,
  };
}

// Specialized data providers for each type - now using direct backend types
export function useContainersProvider(
  autoRefreshInterval = 1000
): DataProviderState<Container> {
  return useDataProvider<Container>('list_containers', autoRefreshInterval);
}

export function useImagesProvider(
  autoRefreshInterval = 1000
): DataProviderState<Image> {
  return useDataProvider<Image>('list_images', autoRefreshInterval);
}

export function useNetworksProvider(
  autoRefreshInterval = 1000
): DataProviderState<Network> {
  return useDataProvider<Network>('list_networks', autoRefreshInterval);
}

export function useVolumesProvider(
  autoRefreshInterval = 1000
): DataProviderState<Volume> {
  return useDataProvider<Volume>('list_volumes', autoRefreshInterval);
}
