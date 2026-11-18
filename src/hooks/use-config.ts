import { useState, useEffect, useCallback } from 'react';
import { ConfigService } from '../lib/config';
import {
  AppConfig,
  TelemetrySettings,
  StartupSettings,
  Theme,
  Language,
} from '../types/config';
import { errorMessage } from '../utils/error-message';

export function useConfig() {
  const configService = ConfigService.getInstance();
  const [config, setConfig] = useState<AppConfig | null>(() =>
    configService.getConfig()
  );
  const [loading, setLoading] = useState(config === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = configService.subscribe(newConfig => {
      setConfig(newConfig);
      setLoading(false);
      setError(null);
    });

    if (!config) {
      configService.loadConfig().catch(err => {
        setError(errorMessage(err, 'Failed to load configuration'));
        setLoading(false);
      });
    }

    return unsubscribe;
  }, [configService, config]);

  const updateTheme = useCallback(
    (theme: Theme) => configService.updateTheme(theme),
    [configService]
  );

  const updateLanguage = useCallback(
    (language: Language) => configService.updateLanguage(language),
    [configService]
  );

  const updateTelemetrySettings = useCallback(
    (settings: TelemetrySettings) =>
      configService.updateTelemetrySettings(settings),
    [configService]
  );

  const updateStartupSettings = useCallback(
    (settings: StartupSettings) =>
      configService.updateStartupSettings(settings),
    [configService]
  );

  const updateSidebarCollapsed = useCallback(
    (sidebarCollapsed: boolean) =>
      configService.updateSidebarCollapsed(sidebarCollapsed),
    [configService]
  );

  const updateLastUpdateCheck = useCallback(
    () => configService.updateLastUpdateCheck(),
    [configService]
  );

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await configService.refreshConfig();
    } catch (err) {
      setError(errorMessage(err, 'Failed to reload configuration'));
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
