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
  enableAutostart,
  disableAutostart,
  saveStartupSettings,
}: {
  config?: AppConfig;
  osAutostart?: boolean;
  readConfig?: () => Promise<AppConfig>;
  enableAutostart?: () => Promise<null>;
  disableAutostart?: () => Promise<null>;
  saveStartupSettings?: () => Promise<null>;
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
        if (saveStartupSettings) {
          return saveStartupSettings();
        }
        config = {
          ...config,
          startup: (args as { settings: StartupSettings }).settings,
        };
        return null;
      case 'plugin:autostart|is_enabled':
        return osAutostart;
      case 'plugin:autostart|enable':
        if (enableAutostart) {
          return enableAutostart();
        }
        osAutostart = true;
        return null;
      case 'plugin:autostart|disable':
        if (disableAutostart) {
          return disableAutostart();
        }
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
    await expect(second).resolves.toEqual(savedConfig());
    expect(backend.count('get_config')).toBe(1);
  });

  it('rejects and publishes nothing when the config cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({ readConfig: () => Promise.reject(new Error('unreadable')) });
    const service = await freshService();
    const subscriber = vi.fn();
    service.subscribe(subscriber);

    await expect(service.loadConfig()).rejects.toThrow('unreadable');

    expect(subscriber).not.toHaveBeenCalled();
    expect(service.getConfig()).toBeNull();
  });

  it('asks the backend again on the next load after a failed read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let reads = 0;
    const backend = mockBackend({
      readConfig: () =>
        ++reads === 1
          ? Promise.reject(new Error('unreadable'))
          : Promise.resolve(savedConfig()),
    });
    const service = await freshService();

    await expect(service.loadConfig()).rejects.toThrow('unreadable');

    await expect(service.loadConfig()).resolves.toEqual(savedConfig());
    expect(backend.count('get_config')).toBe(2);
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

  it('saves nothing when the OS refuses to start Nookat on system boot', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const backend = mockBackend({
      enableAutostart: () => Promise.reject('Permission denied (os error 13)'),
    });
    const service = await freshService();
    const { startup } = await service.loadConfig();

    await expect(
      service.updateStartupSettings({
        ...startup,
        start_on_system_startup: true,
      })
    ).rejects.toThrow(
      'Could not turn on Start on system boot: Permission denied (os error 13)'
    );

    expect(backend.count('update_startup_settings')).toBe(0);
    expect(service.getConfig()?.startup.start_on_system_startup).toBe(false);
    const refreshed = await service.refreshConfig();
    expect(refreshed.startup.start_on_system_startup).toBe(false);
    expect(backend.osAutostart()).toBe(false);
  });

  it('keeps Nookat registered and saves nothing when the OS refuses to remove it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const config = savedConfig();
    config.startup.start_on_system_startup = true;
    const backend = mockBackend({
      config,
      disableAutostart: () => Promise.reject('Permission denied (os error 13)'),
    });
    const service = await freshService();
    const { startup } = await service.loadConfig();

    await expect(
      service.updateStartupSettings({
        ...startup,
        start_on_system_startup: false,
      })
    ).rejects.toThrow(
      'Could not turn off Start on system boot: Permission denied (os error 13)'
    );

    expect(backend.count('update_startup_settings')).toBe(0);
    expect(backend.osAutostart()).toBe(true);
    const refreshed = await service.refreshConfig();
    expect(refreshed.startup.start_on_system_startup).toBe(true);
  });

  it('registers with the OS before it saves the setting', async () => {
    const backend = mockBackend();
    const service = await freshService();
    const { startup } = await service.loadConfig();

    await service.updateStartupSettings({
      ...startup,
      start_on_system_startup: true,
    });

    const commands = backend.calls.map(call => call.cmd);
    expect(commands).toContain('plugin:autostart|enable');
    expect(commands.indexOf('plugin:autostart|enable')).toBeLessThan(
      commands.indexOf('update_startup_settings')
    );
  });

  it('undoes the OS change when the setting cannot be saved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const saveError = 'Failed to save config: Permission denied (os error 13)';
    const backend = mockBackend({
      saveStartupSettings: () => Promise.reject(saveError),
    });
    const service = await freshService();
    const { startup } = await service.loadConfig();

    await expect(
      service.updateStartupSettings({
        ...startup,
        start_on_system_startup: true,
      })
    ).rejects.toBe(saveError);

    expect(backend.count('plugin:autostart|disable')).toBe(1);
    expect(backend.osAutostart()).toBe(false);
    expect(service.getConfig()?.startup.start_on_system_startup).toBe(false);
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
