import { invoke } from '@tauri-apps/api/core';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import {
  AppConfig,
  TelemetrySettings,
  StartupSettings,
  Theme,
  Language,
} from '../types/config';

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig | null = null;
  private isLoading = false;
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

  /**
   * Load configuration from backend
   */
  async loadConfig(): Promise<AppConfig> {
    if (this.config && !this.isLoading) {
      return this.config;
    }

    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.config) {
        return this.config;
      }
      // If still null after waiting, something went wrong
      throw new Error('Failed to load configuration');
    }

    this.isLoading = true;
    try {
      console.log('ConfigService: Loading config from backend...');
      this.config = await invoke<AppConfig>('get_config');
      console.log('ConfigService: Config loaded from backend:', this.config);
      this.notifySubscribers();

      // Sync autostart status after loading config
      setTimeout(() => {
        this.syncAutostartStatus().catch(error => {
          console.warn('Failed to sync autostart status on load:', error);
        });
      }, 100); // Small delay to ensure UI is ready
    } catch (error) {
      console.error('ConfigService: Failed to load config:', error);

      this.config = {
        theme: Theme.System,
        language: Language.English,
        telemetry: {
          send_anonymous_usage_data: false,
          error_reporting: false,
        },
        startup: {
          start_on_system_startup: false,
          minimize_to_tray: true,
          check_for_updates: true,
          auto_update_settings: false,
        },
        sidebar_collapsed: false,
      };
      console.log('ConfigService: Using fallback config:', this.config);
      this.notifySubscribers();
    } finally {
      this.isLoading = false;
    }

    if (this.config) {
      return this.config;
    } else {
      throw new Error('Failed to load configuration');
    }
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
      // Get current settings to check if autostart changed
      const currentConfig = this.config;
      const autostartChanged =
        currentConfig &&
        currentConfig.startup.start_on_system_startup !==
          settings.start_on_system_startup;

      // Update the config first
      await invoke('update_startup_settings', { settings });

      // Handle autostart functionality if it changed
      if (autostartChanged) {
        if (settings.start_on_system_startup) {
          await enable();
        } else {
          await disable();
        }
      }

      await this.refreshConfig();
    } catch (error) {
      console.error('Failed to update startup settings:', error);
      throw error;
    }
  }

  async updateSidebarCollapsed(sidebar_collapsed: boolean): Promise<void> {
    try {
      console.log(
        'ConfigService: updateSidebarCollapsed called with:',
        sidebar_collapsed
      );
      console.log(
        'ConfigService: Current local config before update:',
        this.config
      );

      console.log(
        'ConfigService: Calling backend update_sidebar_collapsed with:',
        sidebar_collapsed
      );
      const result = await invoke('update_sidebar_collapsed', {
        sidebar_collapsed,
      });
      console.log('ConfigService: Backend call result:', result);

      console.log(
        'ConfigService: Backend call successful, updating local config'
      );

      // Update local config immediately to avoid unnecessary refresh
      if (this.config) {
        this.config.sidebar_collapsed = sidebar_collapsed;
        console.log('ConfigService: Updated local config:', this.config);
        this.notifySubscribers();
      }

      // Refresh config from backend to ensure file is updated
      console.log('ConfigService: About to refresh config from backend');
      const refreshedConfig = await this.refreshConfig();
      console.log(
        'ConfigService: Refreshed config from backend:',
        refreshedConfig
      );
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

  // Sync config with actual autostart status
  async syncAutostartStatus(): Promise<void> {
    try {
      const actualAutostartEnabled = await isEnabled();
      const currentConfig = this.config;

      if (
        currentConfig &&
        currentConfig.startup.start_on_system_startup !== actualAutostartEnabled
      ) {
        // Update config to match actual autostart status
        const updatedSettings = {
          ...currentConfig.startup,
          start_on_system_startup: actualAutostartEnabled,
        };

        await invoke('update_startup_settings', { settings: updatedSettings });
        await this.refreshConfig();
      }
    } catch (error) {
      console.warn('Failed to sync autostart status:', error);
      // Don't throw - this is a sync operation, not critical
    }
  }
}
