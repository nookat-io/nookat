import { invoke } from '@tauri-apps/api/core';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import {
  AppConfig,
  TelemetrySettings,
  StartupSettings,
  Theme,
  Language,
} from '../types/config';
import { errorMessage } from '../utils/error-message';

const setOsAutostart = (enabled: boolean) => (enabled ? enable() : disable());

const saveStartupSettings = (settings: StartupSettings) =>
  invoke('update_startup_settings', { settings });

async function switchOsAutostart(enabled: boolean): Promise<void> {
  try {
    await setOsAutostart(enabled);
  } catch (error) {
    const action = enabled ? 'turn on' : 'turn off';
    throw new Error(
      `Could not ${action} Start on system boot: ${errorMessage(error)}`,
      { cause: error }
    );
  }
}

async function saveOrUndoOsAutostart(settings: StartupSettings): Promise<void> {
  try {
    await saveStartupSettings(settings);
  } catch (saveError) {
    try {
      await setOsAutostart(!settings.start_on_system_startup);
    } catch (undoError) {
      console.error('Failed to undo OS autostart change:', undoError);
    }
    throw saveError;
  }
}

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig | null = null;
  private pendingLoad: Promise<AppConfig> | null = null;
  private subscribers: Set<(config: AppConfig | null) => void> = new Set();

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  subscribe(callback: (config: AppConfig | null) => void): () => void {
    this.subscribers.add(callback);

    if (this.config) {
      callback(this.config);
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.error('Error in config subscriber:', error);
      }
    });
  }

  async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }
    this.pendingLoad ??= this.readConfig();
    return this.pendingLoad;
  }

  private async readConfig(): Promise<AppConfig> {
    try {
      const config = await invoke<AppConfig>('get_config');
      this.finishLoading(config);
      this.syncAutostartStatus();
      return config;
    } catch (error) {
      console.error('ConfigService: Failed to load config:', error);
      this.pendingLoad = null;
      throw error;
    }
  }

  private finishLoading(config: AppConfig) {
    this.config = config;
    this.pendingLoad = null;
    this.notifySubscribers();
  }

  getConfig(): AppConfig | null {
    return this.config;
  }

  async updateTheme(theme: Theme): Promise<void> {
    try {
      await invoke('update_theme', { theme });
      await this.refreshConfig();
    } catch (error) {
      console.error('Failed to update theme:', error);
      throw error;
    }
  }

  async updateLanguage(language: Language): Promise<void> {
    try {
      await invoke('update_language', { language });
      await this.refreshConfig();
    } catch (error) {
      console.error('Failed to update language:', error);
      throw error;
    }
  }

  async updateTelemetrySettings(settings: TelemetrySettings): Promise<void> {
    try {
      await invoke('update_telemetry_settings', { settings });
      await this.refreshConfig();
    } catch (error) {
      console.error('Failed to update telemetry settings:', error);
      throw error;
    }
  }

  async updateStartupSettings(settings: StartupSettings): Promise<void> {
    try {
      const autostartChanged =
        this.config !== null &&
        this.config.startup.start_on_system_startup !==
          settings.start_on_system_startup;

      if (autostartChanged) {
        await switchOsAutostart(settings.start_on_system_startup);
        await saveOrUndoOsAutostart(settings);
      } else {
        await saveStartupSettings(settings);
      }

      await this.refreshConfig();
    } catch (error) {
      console.error('Failed to update startup settings:', error);
      throw error;
    }
  }

  async updateSidebarCollapsed(sidebar_collapsed: boolean): Promise<void> {
    try {
      await invoke('update_sidebar_collapsed', {
        sidebarCollapsed: sidebar_collapsed,
      });

      if (this.config) {
        this.config = { ...this.config, sidebar_collapsed };
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Failed to update sidebar collapsed state:', error);
      throw error;
    }
  }

  async updateLastUpdateCheck(): Promise<void> {
    try {
      await invoke('update_last_update_check');
      await this.refreshConfig();
    } catch (error) {
      console.error('Failed to update last update check:', error);
      throw error;
    }
  }

  async isAnalyticsEnabled(): Promise<boolean> {
    const config = await this.loadConfig();
    return config.telemetry.send_anonymous_usage_data;
  }

  async getTelemetrySettings(): Promise<TelemetrySettings> {
    const config = await this.loadConfig();
    return config.telemetry;
  }

  async refreshConfig(): Promise<AppConfig> {
    this.config = null;
    return this.loadConfig();
  }

  async syncAutostartStatus(): Promise<void> {
    try {
      const osAutostartEnabled = await isEnabled();
      const currentConfig = this.config;

      if (
        currentConfig &&
        currentConfig.startup.start_on_system_startup !== osAutostartEnabled
      ) {
        await invoke('update_startup_settings', {
          settings: {
            ...currentConfig.startup,
            start_on_system_startup: osAutostartEnabled,
          },
        });
        await this.refreshConfig();
      }
    } catch (error) {
      console.warn('Failed to sync autostart status:', error);
    }
  }
}
