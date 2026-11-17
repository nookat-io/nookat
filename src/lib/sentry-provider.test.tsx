import { act, render, screen, waitFor } from '@testing-library/react';
import { mockIPC } from '@tauri-apps/api/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfig, Language, TelemetrySettings, Theme } from '../types/config';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  close: vi.fn(() => Promise.resolve(true)),
  replayIntegration: vi.fn(() => 'replay integration'),
  captureConsoleIntegration: vi.fn(() => 'console integration'),
}));

vi.mock('@sentry/react', () => sentry);

const DSN = 'https://public@sentry.example/1';

function savedConfig(errorReporting: boolean): AppConfig {
  return {
    theme: Theme.Dark,
    language: Language.English,
    telemetry: {
      send_anonymous_usage_data: false,
      error_reporting: errorReporting,
    },
    startup: {
      start_on_system_startup: false,
      minimize_to_tray: true,
      check_for_updates: false,
      auto_update_settings: false,
    },
    sidebar_collapsed: false,
  };
}

async function sentryProviderWith({
  errorReporting,
  dsn = DSN,
}: {
  errorReporting: boolean;
  dsn?: string;
}) {
  let config = savedConfig(errorReporting);
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'get_config':
        return config;
      case 'update_telemetry_settings':
        config = {
          ...config,
          telemetry: (args as { settings: TelemetrySettings }).settings,
        };
        return null;
      case 'plugin:autostart|is_enabled':
        return config.startup.start_on_system_startup;
      default:
        throw new Error(`Unexpected command ${cmd}`);
    }
  });
  vi.stubEnv('VITE_SENTRY_DSN', dsn);
  vi.resetModules();
  const [{ SentryProvider }, { useSentryContext }, { ConfigService }] =
    await Promise.all([
      import('./sentry-provider'),
      import('../hooks/use-sentry-context'),
      import('./config'),
    ]);

  function SentryStatusView() {
    const { isInitialized, error } = useSentryContext();
    return (
      <p>
        initialized: {String(isInitialized)}, error: {error ?? 'none'}
      </p>
    );
  }

  render(
    <SentryProvider>
      <SentryStatusView />
    </SentryProvider>
  );
  return { configService: ConfigService.getInstance() };
}

const sentryStatus = () => screen.getByText(/^initialized:/).textContent;

const EXPECTED_INIT_OPTIONS = {
  dsn: DSN,
  dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
  integrations: ['replay integration', 'console integration'],
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1,
};

const switchErrorReporting = (
  configService: {
    updateTelemetrySettings: (s: TelemetrySettings) => Promise<void>;
  },
  errorReporting: boolean
) =>
  act(() =>
    configService.updateTelemetrySettings({
      send_anonymous_usage_data: false,
      error_reporting: errorReporting,
    })
  );

const silenceConsole = () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
};

describe('SentryProvider', () => {
  beforeEach(() => {
    sentry.init.mockReset();
    sentry.close.mockClear();
    sentry.replayIntegration.mockClear();
    sentry.captureConsoleIntegration.mockClear();
    silenceConsole();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('initializes Sentry once error reporting is on, masking replays and collecting no user data', async () => {
    await sentryProviderWith({ errorReporting: true });

    await waitFor(() =>
      expect(sentryStatus()).toBe('initialized: true, error: none')
    );
    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(sentry.init).toHaveBeenCalledWith(EXPECTED_INIT_OPTIONS);
    expect(sentry.replayIntegration).toHaveBeenCalledWith({
      maskAllText: true,
      blockAllMedia: true,
    });
    expect(sentry.captureConsoleIntegration).toHaveBeenCalledWith({
      levels: ['error', 'warn'],
    });
  });

  it('leaves Sentry off while error reporting is disabled', async () => {
    await sentryProviderWith({ errorReporting: false });

    await waitFor(() =>
      expect(console.log).toHaveBeenCalledWith(
        'Sentry is disabled or no DSN provided'
      )
    );
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.close).not.toHaveBeenCalled();
    expect(sentryStatus()).toBe('initialized: false, error: none');
  });

  it('leaves Sentry off in builds without a DSN even when error reporting is on', async () => {
    await sentryProviderWith({ errorReporting: true, dsn: '' });

    await waitFor(() =>
      expect(console.log).toHaveBeenCalledWith(
        'Sentry is disabled or no DSN provided'
      )
    );
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentryStatus()).toBe('initialized: false, error: none');
  });

  it('starts Sentry as soon as error reporting is switched on in settings, without a restart', async () => {
    const { configService } = await sentryProviderWith({
      errorReporting: false,
    });
    await waitFor(() => expect(console.log).toHaveBeenCalled());

    await switchErrorReporting(configService, true);

    await waitFor(() =>
      expect(sentryStatus()).toBe('initialized: true, error: none')
    );
    expect(sentry.init).toHaveBeenCalledTimes(1);
  });

  it('closes Sentry as soon as error reporting is switched off in settings, so no more reports are sent before a restart', async () => {
    const { configService } = await sentryProviderWith({
      errorReporting: true,
    });
    await waitFor(() =>
      expect(sentryStatus()).toBe('initialized: true, error: none')
    );

    await switchErrorReporting(configService, false);

    await waitFor(() =>
      expect(sentryStatus()).toBe('initialized: false, error: none')
    );
    expect(sentry.close).toHaveBeenCalledTimes(1);
  });

  it('starts Sentry again with the same options when error reporting is switched back on', async () => {
    const { configService } = await sentryProviderWith({
      errorReporting: true,
    });
    await waitFor(() =>
      expect(sentryStatus()).toBe('initialized: true, error: none')
    );
    await switchErrorReporting(configService, false);
    await waitFor(() =>
      expect(sentryStatus()).toBe('initialized: false, error: none')
    );

    await switchErrorReporting(configService, true);

    await waitFor(() =>
      expect(sentryStatus()).toBe('initialized: true, error: none')
    );
    expect(sentry.init).toHaveBeenCalledTimes(2);
    expect(sentry.init).toHaveBeenLastCalledWith(EXPECTED_INIT_OPTIONS);
  });

  it('reuses the integrations across restarts, because Session Replay throws when a second instance is created in the same page', async () => {
    const { configService } = await sentryProviderWith({
      errorReporting: true,
    });
    await waitFor(() => expect(sentry.init).toHaveBeenCalledTimes(1));

    await switchErrorReporting(configService, false);
    await switchErrorReporting(configService, true);

    await waitFor(() => expect(sentry.init).toHaveBeenCalledTimes(2));
    const [first, second] = sentry.init.mock.calls.map(
      ([options]) => options.integrations
    );
    expect(second).toBe(first);
    expect(sentry.replayIntegration).toHaveBeenCalledTimes(1);
    expect(sentry.captureConsoleIntegration).toHaveBeenCalledTimes(1);
  });

  it('reports a failed Sentry init through the context instead of crashing the app', async () => {
    sentry.init.mockImplementation(() => {
      throw new Error('invalid DSN');
    });

    await sentryProviderWith({ errorReporting: true });

    await waitFor(() =>
      expect(sentryStatus()).toBe('initialized: false, error: invalid DSN')
    );
  });
});
