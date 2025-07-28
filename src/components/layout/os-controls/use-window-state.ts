import { Window } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';
import { useOSDetection } from './use-os-detection';

export const useWindowState = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const os = useOSDetection();

  useEffect(() => {
    const checkInitialState = async () => {
      try {
        const window = Window.getCurrent();
        const maximized = await window.isMaximized();
        const fullscreen = await window.isFullscreen();
        setIsMaximized(maximized);
        setIsFullscreen(fullscreen);
      } catch (error) {
        console.error('Failed to check initial window state:', error);
      }
    };

    checkInitialState();
  }, []);

  const minimize = () => {
    Window.getCurrent().minimize();
  };

  const maximize = async () => {
    try {
      const window = Window.getCurrent();

      if (os === 'macos') {
        // For macOS, use fullscreen mode
        if (isFullscreen) {
          await window.setFullscreen(false);
          setIsFullscreen(false);
        } else {
          await window.setFullscreen(true);
          setIsFullscreen(true);
        }
      } else {
        // For other OSs (Windows, Linux), use maximize/unmaximize
        if (isMaximized) {
          await window.unmaximize();
          setIsMaximized(false);
        } else {
          await window.maximize();
          setIsMaximized(true);
        }
      }
    } catch (error) {
      console.error('Maximize error:', error);
    }
  };

  const close = () => {
    Window.getCurrent().close();
  };

  return {
    isMaximized,
    isFullscreen,
    minimize,
    maximize,
    close,
  };
};
