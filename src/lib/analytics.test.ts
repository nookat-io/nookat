import { renderHook } from '@testing-library/react';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfig, Language, Theme } from '../types/config';

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock('@aptabase/react', () => ({
  AptabaseProvider: () => null,
  useAptabase: () => ({ trackEvent }),
}));
vi.mock('../config/analytics', () => ({
  ANALYTICS_CONFIG: {
    APTABASE_APP_KEY: 'test-app-key',
    APP_VERSION: '1.2.3',
    BUILD_MODE: 'production',
  },
}));

function configAllowingUsageData(): AppConfig {
  return {
    theme: Theme.System,
    language: Language.English,
    telemetry: { send_anonymous_usage_data: true, error_reporting: false },
    startup: {
      start_on_system_startup: false,
      minimize_to_tray: true,
      check_for_updates: false,
      auto_update_settings: false,
    },
    sidebar_collapsed: false,
  };
}

async function renderAnalytics(readConfig: () => Promise<AppConfig>) {
  mockIPC(cmd => {
    if (cmd === 'get_config') {
      return readConfig();
    }
    if (cmd === 'plugin:autostart|is_enabled') {
      return false;
    }
    throw new Error(`Unexpected command ${cmd}`);
  });
  vi.resetModules();
  const { useAnalytics } = await import('./analytics');
  return renderHook(() => useAnalytics()).result.current;
}

describe('useAnalytics', () => {
  beforeEach(() => {
    trackEvent.mockClear();
  });

  it('tracks a page view when the user allows usage data', async () => {
    const { trackPageView } = await renderAnalytics(async () =>
      configAllowingUsageData()
    );

    await trackPageView('containers');

    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('page_viewed', {
      page: 'containers',
      version: '1.2.3',
    });
  });

  it('sends nothing and does not reject when the config cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { trackPageView } = await renderAnalytics(() =>
      Promise.reject(new Error('unreadable'))
    );

    await expect(trackPageView('containers')).resolves.toBeUndefined();

    expect(trackEvent).not.toHaveBeenCalled();
  });
});
