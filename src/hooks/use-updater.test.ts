import { act, renderHook, waitFor } from '@testing-library/react';
import type { Update } from '@tauri-apps/plugin-updater';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfig, Language, Theme } from '../types/config';
import { useUpdater } from './use-updater';

const updater = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => updater);

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock('sonner', () => ({ toast }));

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

function renderUpdater(checksAutomatically: boolean) {
  const updateLastCheck = vi.fn(async () => {});
  const view = renderHook(({ config }) => useUpdater(config, updateLastCheck), {
    initialProps: { config: configWithAutomaticChecks(checksAutomatically) },
  });
  return { ...view, updateLastCheck };
}

describe('useUpdater', () => {
  beforeEach(() => {
    updater.check.mockReset();
    toast.success.mockClear();
    toast.info.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports the automatic check as running until it finishes, so Check Now stays disabled meanwhile', async () => {
    const { finish } = pendingCheck();
    const { result, updateLastCheck } = renderUpdater(true);

    expect(updater.check).toHaveBeenCalledTimes(1);
    expect(result.current.isChecking).toBe(true);
    expect(result.current.isBusy).toBe(true);

    await act(async () => finish(null));

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.isBusy).toBe(false);
    expect(updateLastCheck).toHaveBeenCalledTimes(1);
  });

  it('keeps the automatic check quiet when the app is up to date, so opening settings does not toast every time', async () => {
    updater.check.mockResolvedValueOnce(null);
    const { result } = renderUpdater(true);

    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(updater.check).toHaveBeenCalledTimes(1);
    expect(toast.info).not.toHaveBeenCalled();
    expect(result.current.hasUpdate).toBe(false);
  });

  it('announces an update found by the automatic check', async () => {
    updater.check.mockResolvedValueOnce(availableUpdate);
    const { result } = renderUpdater(true);

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
    const { result } = renderUpdater(true);

    await waitFor(() => expect(result.current.error).toBe('offline'));

    expect(result.current.isChecking).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not check on its own when automatic checks are off', () => {
    const { result } = renderUpdater(false);

    expect(updater.check).not.toHaveBeenCalled();
    expect(result.current.isChecking).toBe(false);
  });

  it('checks once automatic checks are switched on while settings are open', async () => {
    updater.check.mockResolvedValueOnce(null);
    const { result, rerender } = renderUpdater(false);

    rerender({ config: configWithAutomaticChecks(true) });

    expect(updater.check).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isChecking).toBe(false));
  });

  it('shows a manual check as running and says when there is no update', async () => {
    const { finish } = pendingCheck();
    const { result } = renderUpdater(false);

    act(() => result.current.checkForUpdates());

    expect(result.current.isChecking).toBe(true);
    await act(async () => finish(null));
    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(toast.info).toHaveBeenCalledWith('No updates available');
  });

  it('shows the error of a failed manual check', async () => {
    const { fail } = pendingCheck();
    const { result } = renderUpdater(false);

    act(() => result.current.checkForUpdates());
    await act(async () => fail(new Error('offline')));

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(toast.error).toHaveBeenCalledWith('offline');
    expect(result.current.error).toBe('offline');
  });

  it('shows the reason the updater plugin gives, which arrives as a plain string rather than an Error', async () => {
    updater.check.mockRejectedValueOnce(
      'Could not fetch a valid release JSON from the remote'
    );
    const { result } = renderUpdater(false);

    await act(async () => result.current.checkForUpdates());

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(toast.error).toHaveBeenCalledWith(
      'Could not fetch a valid release JSON from the remote'
    );
  });
});
