import { Window } from '@tauri-apps/api/window';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useOSDetection } from './use-os-detection';

export const useWindowState = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const os = useOSDetection();
  const lastQueryTime = useRef(0);
  const queryDebounceMs = 100; // Debounce queries to avoid performance issues
  const syncIntervalRef = useRef<number | null>(null);

  // Function to query actual window state
  const queryWindowState = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastQueryTime.current < queryDebounceMs) {
      return;
    }

    try {
      const window = Window.getCurrent();
      const [maximized, fullscreen] = await Promise.all([
        window.isMaximized(),
        window.isFullscreen(),
      ]);

      setIsMaximized(maximized);
      setIsFullscreen(fullscreen);
      lastQueryTime.current = now;
    } catch (error) {
      console.error('Failed to query window state:', error);
    }
  }, []);

  useEffect(() => {
    queryWindowState(true);
  }, [queryWindowState]);

  useEffect(() => {
    syncIntervalRef.current = window.setInterval(() => {
      queryWindowState();
    }, 500);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [queryWindowState]);

  const minimize = useCallback(() => {
    Window.getCurrent().minimize();
  }, []);

  const maximize = useCallback(async () => {
    try {
      const window = Window.getCurrent();

      if (os === 'macos') {
        // For macOS, use fullscreen mode
        const currentFullscreen = await window.isFullscreen();
        await window.setFullscreen(!currentFullscreen);
        setTimeout(() => queryWindowState(true), 50);
      } else {
        // For other OSs (Windows, Linux), use maximize/unmaximize
        const currentMaximized = await window.isMaximized();
        if (currentMaximized) {
          await window.unmaximize();
        } else {
          await window.maximize();
        }
        setTimeout(() => queryWindowState(true), 50);
      }
    } catch (error) {
      console.error('Maximize error:', error);
    }
  }, [os, queryWindowState]);

  const close = useCallback(() => {
    Window.getCurrent().close();
  }, []);

  const getEffectiveMaximizeState = useCallback(() => {
    if (os === 'macos') {
      return isFullscreen;
    }
    return isMaximized;
  }, [os, isMaximized, isFullscreen]);

  return {
    isMaximized: getEffectiveMaximizeState(),
    isFullscreen,
    minimize,
    maximize,
    close,
    _rawIsMaximized: isMaximized,
    _rawIsFullscreen: isFullscreen,
  };
};
