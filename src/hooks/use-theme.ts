import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const currentTheme = await invoke<string>('get_theme');
      setTheme(currentTheme as Theme);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load theme');
      setTheme('system'); // Fallback to system theme
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTheme = useCallback(async (newTheme: Theme) => {
    try {
      setError(null);
      await invoke('update_theme', { theme: newTheme });
      setTheme(newTheme);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update theme');
      return false;
    }
  }, []);

  return {
    theme,
    loading,
    error,
    updateTheme,
    reload: loadTheme,
  };
}
