import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  AppConfig,
  TelemetrySettings,
  StartupSettings,
  Theme,
  Language,
} from '../types/config';

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const configData = await invoke<AppConfig>('get_config');
      setConfig(configData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load configuration'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTheme = useCallback(
    async (theme: Theme) => {
      try {
        await invoke('update_theme', { theme });
        await loadConfig(); // Reload config to get updated state
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update theme');
      }
    },
    [loadConfig]
  );

  const updateLanguage = useCallback(
    async (language: Language) => {
      try {
        await invoke('update_language', { language });
        await loadConfig(); // Reload config to get updated state
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update language'
        );
      }
    },
    [loadConfig]
  );

  const updateTelemetrySettings = useCallback(
    async (settings: TelemetrySettings) => {
      try {
        await invoke('update_telemetry_settings', { settings });
        await loadConfig(); // Reload config to get updated state
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to update telemetry settings'
        );
      }
    },
    [loadConfig]
  );

  const updateStartupSettings = useCallback(
    async (settings: StartupSettings) => {
      try {
        await invoke('update_startup_settings', { settings });
        await loadConfig(); // Reload config to get updated state
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to update startup settings'
        );
      }
    },
    [loadConfig]
  );

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    updateTheme,
    updateLanguage,
    updateTelemetrySettings,
    updateStartupSettings,
    reload: loadConfig,
  };
}
