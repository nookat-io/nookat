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

// Legacy V1 config interface (for backward compatibility)
export interface AppConfigV1 {
  theme: Theme;
  language: Language;
  telemetry: TelemetrySettings;
  startup: StartupSettings;
}

// Current V2 config interface (version is handled by enum tag)
export interface AppConfigV2 {
  theme: Theme;
  language: Language;
  telemetry: TelemetrySettings;
  startup: StartupSettings;
}

// Current config type alias for backward compatibility
export type AppConfig = AppConfigV2;
