import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import type { Update } from '@tauri-apps/plugin-updater';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppConfig,
  Language,
  StartupSettings,
  TelemetrySettings,
  Theme,
} from '../../types/config';

const updater = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => updater);

const availableUpdate = {
  version: '1.2.3',
  date: '2026-11-01',
  body: 'Release notes',
} as Update;

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock('sonner', () => ({ toast }));

const savedConfig: AppConfig = {
  theme: Theme.Dark,
  language: Language.English,
  telemetry: { send_anonymous_usage_data: false, error_reporting: true },
  startup: {
    start_on_system_startup: false,
    minimize_to_tray: true,
    check_for_updates: false,
    auto_update_settings: false,
  },
  sidebar_collapsed: false,
};

const MINUTE_MS = 60 * 1000;

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * MINUTE_MS).toISOString();
}

async function renderGeneralSettings({
  readConfig,
  saveTelemetry = async () => null,
  startup = {},
}: {
  readConfig?: () => Promise<AppConfig>;
  saveTelemetry?: () => Promise<null>;
  startup?: Partial<StartupSettings>;
} = {}) {
  let config = {
    ...savedConfig,
    startup: { ...savedConfig.startup, ...startup },
  };
  const telemetryUpdates: TelemetrySettings[] = [];
  const lastCheckRecords = vi.fn();
  mockIPC(async (cmd, args) => {
    switch (cmd) {
      case 'get_config':
        return readConfig ? readConfig() : config;
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
      case 'update_telemetry_settings': {
        await saveTelemetry();
        const { settings } = args as { settings: TelemetrySettings };
        telemetryUpdates.push(settings);
        config = { ...config, telemetry: settings };
        return null;
      }
      case 'plugin:autostart|is_enabled':
        return config.startup.start_on_system_startup;
      default:
        throw new Error(`Unexpected command ${cmd}`);
    }
  });
  vi.resetModules();
  const { GeneralSettings } = await import('./general-settings');
  const { UpdaterProvider } = await import('../../lib/updater-provider');
  const settingsShown = (shown: boolean) => (
    <UpdaterProvider>{shown && <GeneralSettings />}</UpdaterProvider>
  );
  const { rerender } = render(settingsShown(true));
  const showSettings = (shown: boolean) => rerender(settingsShown(shown));
  return { telemetryUpdates, lastCheckRecords, showSettings };
}

describe('GeneralSettings', () => {
  beforeEach(() => {
    updater.check.mockReset();
    toast.success.mockClear();
    toast.info.mockClear();
    toast.error.mockClear();
  });

  it('does not check for updates, toast or save the config when the settings open', async () => {
    const { lastCheckRecords, showSettings } = await renderGeneralSettings({
      startup: { check_for_updates: true, last_update_check: minutesAgo(1) },
    });
    await screen.findByRole('switch', { name: 'Check for updates' });

    showSettings(false);
    showSettings(true);
    await screen.findByRole('switch', { name: 'Check for updates' });

    expect(updater.check).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(lastCheckRecords).not.toHaveBeenCalled();
  });

  it('shows an update found at startup with its Install Update button', async () => {
    updater.check.mockResolvedValue(availableUpdate);
    await renderGeneralSettings({
      startup: {
        check_for_updates: true,
        last_update_check: minutesAgo(2 * 24 * 60),
      },
    });

    expect(await screen.findByText('1.2.3')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Install Update' })
    ).toBeInTheDocument();
  });

  it.each([
    ['Send anonymous usage statistics', 'Anonymous usage statistics enabled'],
    ['Crash reporting', 'Crash reporting disabled'],
  ])(
    'names the telemetry switch that changed when "%s" is toggled',
    async (switchLabel, confirmation) => {
      const user = userEvent.setup();
      await renderGeneralSettings();

      await user.click(
        await screen.findByRole('switch', { name: switchLabel })
      );

      expect(toast.success).toHaveBeenCalledWith(confirmation);
    }
  );

  it('labels the language picker so it is announced and focusable by its label', async () => {
    await renderGeneralSettings();

    expect(
      await screen.findByRole('combobox', { name: 'Interface Language' })
    ).toHaveTextContent('English');
  });

  it('saves only the toggled telemetry switch and keeps the other as it was', async () => {
    const user = userEvent.setup();
    const { telemetryUpdates } = await renderGeneralSettings();

    await user.click(
      await screen.findByRole('switch', { name: 'Crash reporting' })
    );

    expect(telemetryUpdates).toEqual([
      { send_anonymous_usage_data: false, error_reporting: false },
    ]);
  });

  it('keeps the settings on screen and explains why when a setting cannot be saved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderGeneralSettings({
      saveTelemetry: () =>
        Promise.reject(
          'Failed to save config: Permission denied (os error 13)'
        ),
    });
    const crashReporting = await screen.findByRole('switch', {
      name: 'Crash reporting',
    });

    await user.click(crashReporting);

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to save config: Permission denied (os error 13)'
    );
    expect(
      screen.queryByText(/Failed to load settings/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Crash reporting' })
    ).toBeChecked();
    expect(
      screen.getByRole('switch', { name: 'Crash reporting' })
    ).toBeEnabled();
  });

  it('shows why the settings could not be loaded instead of default values', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderGeneralSettings({
      readConfig: () =>
        Promise.reject(
          'Failed to read config: Permission denied (os error 13)'
        ),
    });

    expect(
      await screen.findByText(
        'Failed to load settings: Failed to read config: Permission denied (os error 13)'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
