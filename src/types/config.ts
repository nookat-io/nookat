export enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

export enum Language {
  English = 'en',
  Russian = 'ru',
}

export interface TelemetrySettings {
  send_anonymous_usage_data: boolean;
  error_reporting: boolean;
}

export interface StartupSettings {
  start_on_system_startup: boolean;
  minimize_to_tray: boolean;
  check_for_updates: boolean;
  last_update_check?: string; // ISO date string
  auto_update_settings: boolean;
}

export interface AppConfig {
  theme: Theme;
  language: Language;
  telemetry: TelemetrySettings;
  startup: StartupSettings;
}
