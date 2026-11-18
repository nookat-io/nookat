import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppConfig, Language, Theme } from '../../types/config';

function savedConfig(sidebarCollapsed: boolean): AppConfig {
  return {
    theme: Theme.Dark,
    language: Language.English,
    telemetry: { send_anonymous_usage_data: false, error_reporting: false },
    startup: {
      start_on_system_startup: false,
      minimize_to_tray: true,
      check_for_updates: false,
      auto_update_settings: false,
    },
    sidebar_collapsed: sidebarCollapsed,
  };
}

async function sidebarWithSavedConfig(
  config: AppConfig,
  saveSidebar: (collapsed: boolean) => Promise<null> = async () => null
) {
  const saved: boolean[] = [];
  mockIPC(async (cmd, args) => {
    switch (cmd) {
      case 'get_config':
        return config;
      case 'plugin:autostart|is_enabled':
        return config.startup.start_on_system_startup;
      case 'update_sidebar_collapsed': {
        const { sidebarCollapsed } = args as { sidebarCollapsed: boolean };
        saved.push(sidebarCollapsed);
        return saveSidebar(sidebarCollapsed);
      }
      default:
        throw new Error(`Unexpected command ${cmd}`);
    }
  });
  vi.resetModules();
  const [{ Sidebar }, { MemoryRouter }, { ConfigService }] = await Promise.all([
    import('./sidebar'),
    import('react-router-dom'),
    import('../../lib/config'),
  ]);
  const renderSidebar = (onCommit?: () => void) =>
    render(
      <MemoryRouter>
        <Profiler id="sidebar" onRender={() => onCommit?.()}>
          <Sidebar />
        </Profiler>
      </MemoryRouter>
    );
  return { renderSidebar, configService: ConfigService.getInstance(), saved };
}

const toggleButton = () =>
  screen.getByRole('button', { name: /(Expand|Collapse) sidebar/ });

describe('Sidebar', () => {
  it('opens collapsed when the saved config says so', async () => {
    const { renderSidebar } = await sidebarWithSavedConfig(savedConfig(true));

    renderSidebar();

    await waitFor(() =>
      expect(toggleButton()).toHaveAccessibleName('Expand sidebar')
    );
    expect(screen.queryByText('Containers')).not.toBeInTheDocument();
  });

  it('renders the saved state from its first commit once the config is loaded, so it does not animate shut on startup', async () => {
    const { renderSidebar, configService } = await sidebarWithSavedConfig(
      savedConfig(true)
    );
    await configService.loadConfig();
    const labelPerCommit: (string | null)[] = [];

    renderSidebar(() =>
      labelPerCommit.push(toggleButton().getAttribute('aria-label'))
    );

    expect(labelPerCommit.length).toBeGreaterThan(0);
    expect(new Set(labelPerCommit)).toEqual(new Set(['Expand sidebar']));
  });

  it('persists a toggle and shows it once the save succeeds', async () => {
    const user = userEvent.setup();
    const { renderSidebar, saved } = await sidebarWithSavedConfig(
      savedConfig(false)
    );
    renderSidebar();
    await waitFor(() => expect(screen.getByText('Containers')).toBeVisible());

    await user.click(toggleButton());

    expect(saved).toEqual([true]);
    await waitFor(() =>
      expect(toggleButton()).toHaveAccessibleName('Expand sidebar')
    );
    expect(screen.queryByText('Containers')).not.toBeInTheDocument();
  });

  it('ignores further clicks while a toggle is being saved', async () => {
    const user = userEvent.setup();
    let finishSave!: () => void;
    const { renderSidebar, saved } = await sidebarWithSavedConfig(
      savedConfig(false),
      () => new Promise(resolve => (finishSave = () => resolve(null)))
    );
    renderSidebar();
    await waitFor(() => expect(screen.getByText('Containers')).toBeVisible());

    await user.click(toggleButton());
    await user.click(toggleButton());

    expect(toggleButton()).toBeDisabled();
    expect(toggleButton()).toHaveAttribute('aria-busy', 'true');
    expect(toggleButton()).toHaveAccessibleName('Collapse sidebar');
    await act(async () => finishSave());
    expect(saved).toEqual([true]);
    expect(toggleButton()).toBeEnabled();
    expect(toggleButton()).toHaveAccessibleName('Expand sidebar');
  });

  it('follows a sidebar state saved through the config service from elsewhere in the app', async () => {
    const { renderSidebar, configService } = await sidebarWithSavedConfig(
      savedConfig(false)
    );
    renderSidebar();
    await waitFor(() => expect(screen.getByText('Containers')).toBeVisible());

    await act(() => configService.updateSidebarCollapsed(true));

    expect(toggleButton()).toHaveAccessibleName('Expand sidebar');
  });

  it('keeps the current state when the save fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { renderSidebar, saved } = await sidebarWithSavedConfig(
      savedConfig(true),
      async () => {
        throw new Error('disk full');
      }
    );
    renderSidebar();
    await waitFor(() =>
      expect(toggleButton()).toHaveAccessibleName('Expand sidebar')
    );

    await user.click(toggleButton());

    expect(saved).toEqual([false]);
    await waitFor(() => expect(toggleButton()).toBeEnabled());
    expect(toggleButton()).toHaveAccessibleName('Expand sidebar');
  });
});
