import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

export const MAIN_WINDOW_VISIBILITY_EVENT = 'main-window-visibility';

export function useMainWindowVisible(): boolean {
  const [isVisible, setIsVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let isCurrent = true;
    let hasHeardAnnouncement = false;

    const unlisten = listen<boolean>(MAIN_WINDOW_VISIBILITY_EVENT, event => {
      hasHeardAnnouncement = true;
      setIsVisible(event.payload);
    });

    Promise.resolve()
      .then(() => getCurrentWindow().isVisible())
      .catch(error => {
        console.error('Failed to read the main window visibility:', error);
        return true;
      })
      .then(visible => {
        if (isCurrent && !hasHeardAnnouncement) setIsVisible(visible);
      });

    return () => {
      isCurrent = false;
      unlisten.then(stop => stop());
    };
  }, []);

  return isVisible === true;
}
