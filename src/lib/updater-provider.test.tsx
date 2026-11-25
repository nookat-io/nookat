import { act, fireEvent, render, screen } from '@testing-library/react';
import { mockIPC } from '@tauri-apps/api/mocks';
import type { Update } from '@tauri-apps/plugin-updater';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfig, Language, Theme } from '../types/config';

const updater = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => updater);

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock('sonner', () => ({ toast }));

const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date('2026-11-23T12:00:00Z');

const availableUpdate = {
  version: '1.2.3',
  date: '2026-11-01',
  body: 'Release notes',
} as Update;

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
}

function configWithLastCheck(lastUpdateCheck: string | undefined): AppConfig {
  return {
    theme: Theme.Dark,
    language: Language.English,
    telemetry: { send_anonymous_usage_data: false, error_reporting: false },
    startup: {
      start_on_system_startup: false,
      minimize_to_tray: true,
      check_for_updates: true,
      auto_update_settings: false,
      last_update_check: lastUpdateCheck,
    },
    sidebar_collapsed: false,
  };
}

function mockBackend(lastUpdateCheck: string | undefined) {
  let config = configWithLastCheck(lastUpdateCheck);
  const lastCheckRecords = vi.fn();
  mockIPC(cmd => {
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
      case 'update_sidebar_collapsed':
        return null;
      case 'plugin:autostart|is_enabled':
        return false;
      default:
        throw new Error(`Unexpected command ${cmd}`);
    }
  });
  return { lastCheckRecords };
}

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

const passHours = (hours: number) =>
  act(() => vi.advanceTimersByTimeAsync(hours * HOUR_MS));

async function renderProvider({ reactStrictMode = false } = {}) {
  vi.resetModules();
  const { UpdaterProvider } = await import('./updater-provider');
  const { useUpdater } = await import('../hooks/use-updater');
  const { ConfigService } = await import('./config');

  function FoundUpdate() {
    const { currentUpdate } = useUpdater();
    return <p>{currentUpdate ? currentUpdate.version : 'No update'}</p>;
  }

  render(
    <UpdaterProvider>
      <FoundUpdate />
    </UpdaterProvider>,
    { reactStrictMode }
  );
  await settle();

  return {
    collapseSidebar: () =>
      act(() => ConfigService.getInstance().updateSidebarCollapsed(true)),
  };
}

async function renderProviderAroundRoutes() {
  vi.resetModules();
  const { UpdaterProvider } = await import('./updater-provider');
  window.history.pushState({}, '', '/');

  render(
    <BrowserRouter>
      <UpdaterProvider>
        <Link to="/images">Images</Link>
        <Routes>
          <Route path="/" element={<p>Containers page</p>} />
          <Route path="/images" element={<p>Images page</p>} />
        </Routes>
      </UpdaterProvider>
    </BrowserRouter>
  );
  await settle();
}

describe('UpdaterProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    updater.check.mockReset();
    toast.success.mockClear();
    toast.info.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('checks for updates at startup when the last check is more than a day old', async () => {
    updater.check.mockResolvedValue(null);
    const { lastCheckRecords } = mockBackend(hoursAgo(25));

    await renderProvider();

    expect(updater.check).toHaveBeenCalledTimes(1);
    expect(lastCheckRecords).toHaveBeenCalledTimes(1);
  });

  it('checks only once at startup under StrictMode', async () => {
    updater.check.mockResolvedValue(null);
    mockBackend(hoursAgo(25));

    await renderProvider({ reactStrictMode: true });

    expect(updater.check).toHaveBeenCalledTimes(1);
  });

  it('checks for updates at startup when it has never checked', async () => {
    updater.check.mockResolvedValue(null);
    mockBackend(undefined);

    await renderProvider();

    expect(updater.check).toHaveBeenCalledTimes(1);
  });

  it('waits until a day has passed since the last check before checking again', async () => {
    updater.check.mockResolvedValue(null);
    mockBackend(hoursAgo(1));

    await renderProvider();
    expect(updater.check).not.toHaveBeenCalled();

    await passHours(22);
    expect(updater.check).not.toHaveBeenCalled();

    await passHours(1);
    expect(updater.check).toHaveBeenCalledTimes(1);
  });

  it('checks again a day after its own successful check while it keeps running', async () => {
    updater.check.mockResolvedValue(null);
    const { lastCheckRecords } = mockBackend(undefined);

    await renderProvider();
    await passHours(23);
    expect(updater.check).toHaveBeenCalledTimes(1);

    await passHours(1);
    expect(updater.check).toHaveBeenCalledTimes(2);
    expect(lastCheckRecords).toHaveBeenCalledTimes(2);
  });

  it('announces an update found by automatic checks once per version', async () => {
    updater.check.mockResolvedValue(availableUpdate);
    mockBackend(hoursAgo(25));

    await renderProvider();
    await passHours(24);

    expect(updater.check).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Update available: v1.2.3');
    expect(screen.getByText('1.2.3')).toBeInTheDocument();
  });

  it('retries a failed automatic check an hour later without telling the user', async () => {
    updater.check
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(null);
    const { lastCheckRecords } = mockBackend(hoursAgo(25));

    await renderProvider();
    expect(updater.check).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(lastCheckRecords).not.toHaveBeenCalled();

    await passHours(0.5);
    expect(updater.check).toHaveBeenCalledTimes(1);

    await passHours(0.5);
    expect(updater.check).toHaveBeenCalledTimes(2);
    expect(toast.error).not.toHaveBeenCalled();
    expect(lastCheckRecords).toHaveBeenCalledTimes(1);
  });

  it('retries a failed automatic check an hour after the failure when the config changes in between', async () => {
    updater.check
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(null);
    mockBackend(hoursAgo(25));

    const { collapseSidebar } = await renderProvider();
    expect(updater.check).toHaveBeenCalledTimes(1);

    await passHours(59 / 60);
    await collapseSidebar();
    expect(updater.check).toHaveBeenCalledTimes(1);

    await passHours(1 / 60);
    expect(updater.check).toHaveBeenCalledTimes(2);
  });

  it('checks again a day after its successful check when the config changes in between', async () => {
    updater.check.mockResolvedValue(null);
    mockBackend(hoursAgo(25));

    const { collapseSidebar } = await renderProvider();
    expect(updater.check).toHaveBeenCalledTimes(1);

    await passHours(23.5);
    await collapseSidebar();
    expect(updater.check).toHaveBeenCalledTimes(1);

    await passHours(0.5);
    expect(updater.check).toHaveBeenCalledTimes(2);
  });

  it('does not check on its own when automatic checks are off', async () => {
    const config = {
      ...configWithLastCheck(undefined),
      startup: {
        ...configWithLastCheck(undefined).startup,
        check_for_updates: false,
      },
    };
    mockIPC(cmd => {
      if (cmd === 'get_config') return config;
      if (cmd === 'plugin:autostart|is_enabled') return false;
      throw new Error(`Unexpected command ${cmd}`);
    });

    await renderProvider();
    await passHours(48);

    expect(updater.check).not.toHaveBeenCalled();
  });

  it('navigates while the update check has not answered yet', async () => {
    updater.check.mockReturnValue(new Promise(() => {}));
    mockBackend(undefined);

    await renderProviderAroundRoutes();
    expect(updater.check).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('link', { name: 'Images' }));
    await settle();

    expect(screen.getByText('Images page')).toBeInTheDocument();
  });
});
