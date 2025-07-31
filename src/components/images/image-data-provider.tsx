import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface ImageData {
  id: string;
  repository: string | null;
  tag: string | null;
  image_id: string;
  created: number;
  size: number;
  in_use: boolean;
}

interface ImageDataProviderProps {
  children: (data: {
    images: ImageData[];
    isLoading: boolean;
    error: string | null;
    refreshImages: () => Promise<void>;
  }) => React.ReactNode;
}

const AUTO_REFRESH_INTERVAL = 1000; // 1 second for responsive updates

export function ImageDataProvider({ children }: ImageDataProviderProps) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastRefreshTime = useRef<number>(Date.now());
  const autoRefreshInterval = useRef<number | null>(null);

  async function getImages(silent = false) {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      const result = await invoke<ImageData[]>('list_images');
      setImages(result);
      lastRefreshTime.current = Date.now();
    } catch (error) {
      console.error('Error getting images:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch images';
      setError(errorMessage);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }

  async function refreshImages() {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<ImageData[]>('list_images');
      setImages(result);
      lastRefreshTime.current = Date.now();
    } catch (error) {
      console.error('Error getting images:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch images';
      setError(errorMessage);
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
          getImages(true);
        }
      }, AUTO_REFRESH_INTERVAL);
    };

    // Initial load
    getImages();

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
        images,
        isLoading: isInitialLoad || isLoading,
        error,
        refreshImages,
      })}
    </>
  );
}
