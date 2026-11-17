import { render, waitFor } from '@testing-library/react';
import { mockIPC } from '@tauri-apps/api/mocks';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppConfig, Language, Theme } from '../types/config';
import indexHtml from '../../index.html?raw';

function configWithTheme(theme: Theme): AppConfig {
  return {
    theme,
    language: Language.English,
    telemetry: { send_anonymous_usage_data: false, error_reporting: false },
    startup: {
      start_on_system_startup: false,
      minimize_to_tray: true,
      check_for_updates: false,
      auto_update_settings: false,
    },
    sidebar_collapsed: false,
  };
}

function stubSystemColorScheme(prefersDark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: prefersDark && query === '(prefers-color-scheme: dark)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

async function renderWithSavedTheme(theme: Theme) {
  mockIPC(cmd => {
    if (cmd === 'get_config') {
      return configWithTheme(theme);
    }
    if (cmd === 'plugin:autostart|is_enabled') {
      return false;
    }
    throw new Error(`Unexpected command ${cmd}`);
  });
  vi.resetModules();
  const { ThemeProvider } = await import('./theme-provider');
  render(
    <ThemeProvider>
      <div />
    </ThemeProvider>
  );
}

describe('ThemeProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.className = '';
    document.body.className = '';
  });

  it('applies the theme saved in the config', async () => {
    stubSystemColorScheme(false);

    await renderWithSavedTheme(Theme.Dark);

    await waitFor(() =>
      expect(document.documentElement).toHaveClass(Theme.Dark)
    );
    expect(document.documentElement).not.toHaveClass(Theme.Light);
    expect(document.body).toHaveClass(Theme.Dark);
  });

  it('resolves the system theme from the OS color scheme', async () => {
    stubSystemColorScheme(true);

    await renderWithSavedTheme(Theme.System);

    await waitFor(() =>
      expect(document.documentElement).toHaveClass(Theme.Dark)
    );
  });

  it('remembers the configured theme so the next launch paints it before the config loads', async () => {
    stubSystemColorScheme(false);

    await renderWithSavedTheme(Theme.Dark);

    const { THEME_FOR_FIRST_PAINT_KEY } = await import('./theme-provider');
    await waitFor(() =>
      expect(localStorage.getItem(THEME_FOR_FIRST_PAINT_KEY)).toBe(Theme.Dark)
    );
  });

  it('is read back by the first-paint script in index.html under the same key', async () => {
    const { THEME_FOR_FIRST_PAINT_KEY } = await import('./theme-provider');

    expect(indexHtml).toContain(
      `localStorage.getItem('${THEME_FOR_FIRST_PAINT_KEY}')`
    );
  });
});
