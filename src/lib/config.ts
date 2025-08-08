import { invoke } from '@tauri-apps/api/core';
import {
  AppConfig,
  TelemetrySettings,
  StartupSettings,
  Theme,
  Language,
  UpdateChannel,
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
    console.log('ConfigService: Notifying subscribers, config:', this.config);
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
      return this.config!;
    }

    this.isLoading = true;
    try {
      this.config = await invoke<AppConfig>('get_config');
      this.notifySubscribers();
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
          update_channel: UpdateChannel.Stable,
          auto_update_settings: false,
        },
      };
      this.notifySubscribers();
    } finally {
      this.isLoading = false;
    }

    return this.config;
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
      await invoke('update_startup_settings', { settings });
      await this.refreshConfig();
    } catch (error) {
      console.error('Failed to update startup settings:', error);
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
}
