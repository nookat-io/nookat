import { mockIPC } from '@tauri-apps/api/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfig, Language, StartupSettings, Theme } from '../types/config';

function savedConfig(): AppConfig {
  return {
    theme: Theme.Dark,
    language: Language.English,
    telemetry: { send_anonymous_usage_data: true, error_reporting: true },
    startup: {
      start_on_system_startup: false,
      minimize_to_tray: true,
      check_for_updates: true,
      auto_update_settings: false,
    },
    sidebar_collapsed: false,
  };
}

function mockBackend({
  config = savedConfig(),
  osAutostart = config.startup.start_on_system_startup,
  readConfig,
}: {
  config?: AppConfig;
  osAutostart?: boolean;
  readConfig?: () => Promise<AppConfig>;
} = {}) {
  const calls: { cmd: string; args?: unknown }[] = [];
  mockIPC((cmd, args) => {
    calls.push({ cmd, args });
    switch (cmd) {
      case 'get_config':
        return readConfig ? readConfig() : JSON.parse(JSON.stringify(config));
      case 'update_theme':
        config = { ...config, theme: (args as { theme: Theme }).theme };
        return null;
      case 'update_startup_settings':
        config = {
          ...config,
          startup: (args as { settings: StartupSettings }).settings,
        };
        return null;
      case 'plugin:autostart|is_enabled':
        return osAutostart;
      case 'plugin:autostart|enable':
        osAutostart = true;
        return null;
      case 'plugin:autostart|disable':
        osAutostart = false;
        return null;
      default:
        throw new Error(`Unexpected command ${cmd}`);
    }
  });
  return {
    calls,
    count: (cmd: string) => calls.filter(call => call.cmd === cmd).length,
    osAutostart: () => osAutostart,
  };
}

async function freshService() {
  vi.resetModules();
  const { ConfigService } = await import('./config');
  return ConfigService.getInstance();
}

describe('ConfigService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the config from the backend once and then serves it from memory', async () => {
    const backend = mockBackend();
    const service = await freshService();

    expect(await service.loadConfig()).toEqual(savedConfig());
    expect(await service.loadConfig()).toEqual(savedConfig());
    expect(backend.count('get_config')).toBe(1);
  });

  it('shares one backend read between loads that overlap', async () => {
    let finishRead!: (config: AppConfig) => void;
    const backend = mockBackend({
      readConfig: () => new Promise(resolve => (finishRead = resolve)),
    });
    const service = await freshService();

    const first = service.loadConfig();
    const second = service.loadConfig();
    await vi.waitFor(() => expect(backend.count('get_config')).toBe(1));
    finishRead(savedConfig());

    await expect(first).resolves.toEqual(savedConfig());
    await vi.advanceTimersByTimeAsync(100);
    await expect(second).resolves.toEqual(savedConfig());
    expect(backend.count('get_config')).toBe(1);
  });

  it('falls back to defaults with telemetry off when the config cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({ readConfig: () => Promise.reject(new Error('unreadable')) });
    const service = await freshService();
    const subscriber = vi.fn();
    service.subscribe(subscriber);

    const config = await service.loadConfig();

    expect(config).toMatchObject({
      theme: Theme.System,
      telemetry: { send_anonymous_usage_data: false, error_reporting: false },
    });
    expect(subscriber).toHaveBeenCalledWith(config);
  });

  it('gives a new subscriber the current config and stops after unsubscribing', async () => {
    mockBackend();
    const service = await freshService();
    await service.loadConfig();
    const subscriber = vi.fn();

    const unsubscribe = service.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledExactlyOnceWith(savedConfig());

    unsubscribe();
    await service.updateTheme(Theme.Light);
    expect(subscriber).toHaveBeenCalledOnce();
  });

  it('saves a theme change and passes the saved config to subscribers', async () => {
    const backend = mockBackend();
    const service = await freshService();
    await service.loadConfig();
    const subscriber = vi.fn();
    service.subscribe(subscriber);

    await service.updateTheme(Theme.Light);

    expect(backend.calls).toContainEqual({
      cmd: 'update_theme',
      args: { theme: Theme.Light },
    });
    expect(subscriber).toHaveBeenLastCalledWith(
      expect.objectContaining({ theme: Theme.Light })
    );
  });

  it('switches OS autostart only when start on system startup changes', async () => {
    const backend = mockBackend();
    const service = await freshService();
    const { startup } = await service.loadConfig();

    await service.updateStartupSettings({
      ...startup,
      start_on_system_startup: true,
    });
    expect(backend.osAutostart()).toBe(true);
    expect(backend.count('plugin:autostart|enable')).toBe(1);

    await service.updateStartupSettings({
      ...startup,
      start_on_system_startup: true,
      minimize_to_tray: false,
    });
    expect(backend.count('plugin:autostart|enable')).toBe(1);
    expect(backend.count('plugin:autostart|disable')).toBe(0);

    await service.updateStartupSettings({
      ...startup,
      start_on_system_startup: false,
    });
    expect(backend.osAutostart()).toBe(false);
  });

  it('adopts the OS autostart state when it differs from the saved setting', async () => {
    mockBackend({ osAutostart: true });
    const service = await freshService();
    await service.loadConfig();
    const subscriber = vi.fn();
    service.subscribe(subscriber);

    await vi.waitFor(() =>
      expect(service.getConfig()?.startup.start_on_system_startup).toBe(true)
    );
    expect(subscriber).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startup: expect.objectContaining({ start_on_system_startup: true }),
      })
    );
  });
});
