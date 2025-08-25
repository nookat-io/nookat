import { useState, useEffect, useCallback } from 'react';
import { ConfigService } from '../lib/config';
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

  const configService = ConfigService.getInstance();

  // Subscribe to config changes
  useEffect(() => {
    const unsubscribe = configService.subscribe(newConfig => {
      setConfig(newConfig);
      setLoading(false);
      setError(null);
    });

    // Load config if not already loaded
    if (!config) {
      configService.loadConfig().catch(err => {
        setError(
          err instanceof Error ? err.message : 'Failed to load configuration'
        );
        setLoading(false);
      });
    }

    return unsubscribe;
  }, [configService]); // Remove config from dependency array to prevent infinite loops

  const updateTheme = useCallback(
    async (theme: Theme) => {
      try {
        setError(null);
        await configService.updateTheme(theme);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update theme');
        throw err;
      }
    },
    [configService]
  );

  const updateLanguage = useCallback(
    async (language: Language) => {
      try {
        setError(null);
        await configService.updateLanguage(language);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update language'
        );
        throw err;
      }
    },
    [configService]
  );

  const updateTelemetrySettings = useCallback(
    async (settings: TelemetrySettings) => {
      try {
        setError(null);
        await configService.updateTelemetrySettings(settings);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to update telemetry settings'
        );
        throw err;
      }
    },
    [configService]
  );

  const updateStartupSettings = useCallback(
    async (settings: StartupSettings) => {
      try {
        setError(null);
        await configService.updateStartupSettings(settings);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to update startup settings'
        );
        throw err;
      }
    },
    [configService]
  );

  const updateSidebarCollapsed = useCallback(
    async (sidebar_collapsed: boolean) => {
      try {
        setError(null);
        await configService.updateSidebarCollapsed(sidebar_collapsed);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to update sidebar collapsed state'
        );
        throw err;
      }
    },
    [configService]
  );

  const updateLastUpdateCheck = useCallback(async () => {
    try {
      setError(null);
      await configService.updateLastUpdateCheck();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update last update check'
      );
      throw err;
    }
  }, [configService]);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await configService.refreshConfig();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reload configuration'
      );
    } finally {
      setLoading(false);
    }
  }, [configService]);

  return {
    config,
    loading,
    error,
    updateTheme,
    updateLanguage,
    updateTelemetrySettings,
    updateStartupSettings,
    updateSidebarCollapsed,
    updateLastUpdateCheck,
    reload,
  };
}
