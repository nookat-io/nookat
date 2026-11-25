import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

export const MAIN_WINDOW_VISIBILITY_EVENT = 'main-window-visibility';

export function useMainWindowVisible(): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const unlisten = listen<boolean>(MAIN_WINDOW_VISIBILITY_EVENT, event =>
      setIsVisible(event.payload)
    );
    return () => {
      unlisten.then(stop => stop());
    };
  }, []);

  return isVisible;
}
