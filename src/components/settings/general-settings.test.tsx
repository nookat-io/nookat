import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppConfig,
  Language,
  TelemetrySettings,
  Theme,
} from '../../types/config';

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

async function renderGeneralSettings({
  saveTelemetry = async () => null,
}: { saveTelemetry?: () => Promise<null> } = {}) {
  let config = savedConfig;
  const telemetryUpdates: TelemetrySettings[] = [];
  mockIPC(async (cmd, args) => {
    switch (cmd) {
      case 'get_config':
        return config;
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
  render(<GeneralSettings />);
  return { telemetryUpdates };
}

describe('GeneralSettings', () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
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
});
