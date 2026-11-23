import { act, renderHook, waitFor } from '@testing-library/react';
import { mockIPC } from '@tauri-apps/api/mocks';
import type { Update } from '@tauri-apps/plugin-updater';
import { createElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfig, Language, StartupSettings, Theme } from '../types/config';

const updater = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => updater);

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock('sonner', () => ({ toast }));

const MORE_THAN_A_DAY_AGO = new Date(
  Date.now() - 25 * 60 * 60 * 1000
).toISOString();

function configWithAutomaticChecks(checkForUpdates: boolean): AppConfig {
  return {
    theme: Theme.Dark,
    language: Language.English,
    telemetry: { send_anonymous_usage_data: false, error_reporting: false },
    startup: {
      start_on_system_startup: false,
      minimize_to_tray: true,
      check_for_updates: checkForUpdates,
      auto_update_settings: false,
      last_update_check: MORE_THAN_A_DAY_AGO,
    },
    sidebar_collapsed: false,
  };
}

const availableUpdate = {
  version: '1.2.3',
  date: '2026-11-01',
  body: 'Release notes',
} as Update;

function pendingCheck() {
  let finish!: (update: Update | null) => void;
  let fail!: (error: Error) => void;
  updater.check.mockReturnValueOnce(
    new Promise<Update | null>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    })
  );
  return { finish, fail };
}

function installableUpdate(install: () => Promise<void>): Update {
  return Object.assign({}, availableUpdate, {
    downloadAndInstall: vi.fn(install),
  });
}

function mockBackend(
  checksAutomatically: boolean,
  restart: () => unknown = () => null
) {
  let config = configWithAutomaticChecks(checksAutomatically);
  const lastCheckRecords = vi.fn();
  const restarts = vi.fn(restart);
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'get_config':
        return config;
      case 'update_last_update_check':
        lastCheckRecords();
        config = {
          ...config,
          startup: {
            ...config.startup,
            last_update_check: new Date().toISOString(),
          },
        };
        return null;
      case 'update_startup_settings': {
        const { settings } = args as { settings: StartupSettings };
        config = { ...config, startup: settings };
        return null;
      }
      case 'plugin:autostart|is_enabled':
        return false;
      case 'restart_app':
        return restarts();
      default:
        throw new Error(`Unexpected command ${cmd}`);
    }
  });
  return { lastCheckRecords, restarts };
}

async function renderUpdater() {
  vi.resetModules();
  const { UpdaterProvider } = await import('../lib/updater-provider');
  const { useUpdater } = await import('./use-updater');
  const { ConfigService } = await import('../lib/config');
  await ConfigService.getInstance().loadConfig();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(UpdaterProvider, null, children);
  const view = renderHook(() => useUpdater(), { wrapper });
  return { ...view, configService: ConfigService.getInstance() };
}

async function findAndInstall(update: Update) {
  updater.check.mockResolvedValueOnce(update);
  const { result } = await renderUpdater();
  await act(async () => result.current.checkForUpdates());
  await waitFor(() => expect(result.current.hasUpdate).toBe(true));
  await act(() => result.current.downloadAndInstall());
  return result;
}

describe('useUpdater', () => {
  beforeEach(() => {
    updater.check.mockReset();
    toast.success.mockClear();
    toast.info.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('throws outside an UpdaterProvider', async () => {
    const { useUpdater } = await import('./use-updater');

    expect(() => renderHook(() => useUpdater())).toThrow(
      'useUpdater must be used within an UpdaterProvider'
    );
  });

  it('reports the automatic check as running until it finishes, so Check Now stays disabled meanwhile', async () => {
    const { finish } = pendingCheck();
    const { lastCheckRecords } = mockBackend(true);
    const { result } = await renderUpdater();

    expect(updater.check).toHaveBeenCalledTimes(1);
    expect(result.current.isChecking).toBe(true);
    expect(result.current.isBusy).toBe(true);

    await act(async () => finish(null));

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.isBusy).toBe(false);
    expect(lastCheckRecords).toHaveBeenCalledTimes(1);
  });

  it('keeps the automatic check quiet when the app is up to date', async () => {
    updater.check.mockResolvedValueOnce(null);
    mockBackend(true);
    const { result } = await renderUpdater();

    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(updater.check).toHaveBeenCalledTimes(1);
    expect(toast.info).not.toHaveBeenCalled();
    expect(result.current.hasUpdate).toBe(false);
  });

  it('announces an update found by the automatic check', async () => {
    updater.check.mockResolvedValueOnce(availableUpdate);
    mockBackend(true);
    const { result } = await renderUpdater();

    await waitFor(() => expect(result.current.hasUpdate).toBe(true));

    expect(toast.success).toHaveBeenCalledWith('Update available: v1.2.3');
    expect(result.current.currentUpdate).toEqual({
      version: '1.2.3',
      date: '2026-11-01',
      body: 'Release notes',
      pubDate: undefined,
    });
  });

  it('keeps a failed automatic check quiet', async () => {
    updater.check.mockRejectedValueOnce(new Error('offline'));
    const { lastCheckRecords } = mockBackend(true);
    const { result } = await renderUpdater();

    await waitFor(() => expect(result.current.error).toBe('offline'));

    expect(result.current.isChecking).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
    expect(lastCheckRecords).not.toHaveBeenCalled();
  });

  it('does not check on its own when automatic checks are off', async () => {
    mockBackend(false);
    const { result } = await renderUpdater();

    expect(updater.check).not.toHaveBeenCalled();
    expect(result.current.isChecking).toBe(false);
  });

  it('checks once automatic checks are switched on', async () => {
    updater.check.mockResolvedValueOnce(null);
    mockBackend(false);
    const { result, configService } = await renderUpdater();

    await act(() =>
      configService.updateStartupSettings(
        configWithAutomaticChecks(true).startup
      )
    );

    expect(updater.check).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isChecking).toBe(false));
  });

  it('shows a manual check as running and says when there is no update', async () => {
    const { finish } = pendingCheck();
    const { lastCheckRecords } = mockBackend(false);
    const { result } = await renderUpdater();

    act(() => result.current.checkForUpdates());

    expect(result.current.isChecking).toBe(true);
    await act(async () => finish(null));
    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(toast.info).toHaveBeenCalledWith('No updates available');
    expect(lastCheckRecords).toHaveBeenCalledTimes(1);
  });

  it('reports an update found by Check Now even when it was announced already', async () => {
    updater.check.mockResolvedValue(availableUpdate);
    mockBackend(true);
    const { result } = await renderUpdater();
    await waitFor(() => expect(result.current.hasUpdate).toBe(true));

    await act(async () => result.current.checkForUpdates());

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(2));
  });

  it('shows the error of a failed manual check', async () => {
    const { fail } = pendingCheck();
    mockBackend(false);
    const { result } = await renderUpdater();

    act(() => result.current.checkForUpdates());
    await act(async () => fail(new Error('offline')));

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(toast.error).toHaveBeenCalledWith('offline');
    expect(result.current.error).toBe('offline');
  });

  it('restarts Nookat once the update is installed, so the new version runs', async () => {
    const { restarts } = mockBackend(false);
    const update = installableUpdate(async () => {});

    await findAndInstall(update);

    expect(update.downloadAndInstall).toHaveBeenCalled();
    expect(restarts).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      'Update installed, restarting Nookat'
    );
  });

  it('asks for a manual restart when the automatic restart fails', async () => {
    mockBackend(false, () => Promise.reject('restart refused'));

    await findAndInstall(installableUpdate(async () => {}));

    expect(toast.error).toHaveBeenCalledWith(
      'Update installed, but Nookat could not restart: restart refused. Restart it to finish updating.'
    );
  });

  it('does not restart when installing the update fails', async () => {
    const { restarts } = mockBackend(false);

    const result = await findAndInstall(
      installableUpdate(() => Promise.reject('signature mismatch'))
    );

    expect(restarts).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('signature mismatch');
    expect(result.current.isInstalling).toBe(false);
  });

  it('shows the reason the updater plugin gives, which arrives as a plain string rather than an Error', async () => {
    updater.check.mockRejectedValueOnce(
      'Could not fetch a valid release JSON from the remote'
    );
    mockBackend(false);
    const { result } = await renderUpdater();

    await act(async () => result.current.checkForUpdates());

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(toast.error).toHaveBeenCalledWith(
      'Could not fetch a valid release JSON from the remote'
    );
  });
});
