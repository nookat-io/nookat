import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emit } from '@tauri-apps/api/event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Container,
  ContainerState,
} from '../components/containers/container-types';
import { EngineProvider } from '../lib/engine-provider';
import {
  aContainer,
  CommandHandlers,
  recordCommands,
  SentCommand,
  succeedsFor,
} from '../tests/containers';
import { EngineState } from '../types/engine-state';
import ContainersPage from './ContainersPage';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../hooks/use-analytics', () => ({ usePageAnalytics: () => {} }));

const web = aContainer('web', ContainerState.Running, { image: 'nginx' });
const cache = aContainer('cache', ContainerState.Running, { image: 'redis' });
const old = aContainer('old', ContainerState.Exited, { image: 'busybox' });
const stale = aContainer('stale', ContainerState.Exited, { image: 'alpine' });

function snapshot(version: number, containers: Container[]): EngineState {
  return {
    containers: Object.fromEntries(containers.map(c => [c.id, c])),
    images: {},
    volumes: {},
    networks: {},
    engine_status: { Running: 'Docker' },
    version,
    last_updated: '2026-01-01T00:00:00Z',
  };
}

function mockEngine(containers: Container[], commands: CommandHandlers = {}) {
  return recordCommands(
    {
      engine_status: () => ({ Running: 'Docker' }),
      get_docker_info: () => ({}),
      start_engine_state_monitoring: () => null,
      get_engine_state: () => snapshot(1, containers),
      ...commands,
    },
    { shouldMockEvents: true }
  );
}

const sentBy = (sent: SentCommand[], cmd: string) =>
  sent.filter(command => command.cmd === cmd).map(command => command.args);

async function renderPage() {
  render(
    <EngineProvider>
      <ContainersPage />
    </EngineProvider>
  );
  await screen.findByRole('checkbox', { name: 'Select all containers' });
  await screen.findByText(/containers? found/);
}

const listedNames = () =>
  screen
    .queryAllByRole('checkbox', { name: /^Select (?!all containers$)/ })
    .map(checkbox =>
      checkbox.getAttribute('aria-label')?.replace('Select ', '')
    );

describe('ContainersPage', () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it('lists the containers of the engine snapshot', async () => {
    mockEngine([web, cache, old]);

    await renderPage();

    expect(listedNames()).toEqual(['cache', 'old', 'web']);
    expect(screen.getByText(/3 containers found/)).toBeInTheDocument();
  });

  it('filters by state and searches names and images', async () => {
    const user = userEvent.setup();
    mockEngine([web, cache, old]);
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Running' }));
    expect(listedNames()).toEqual(['cache', 'web']);

    await user.click(screen.getByRole('button', { name: 'Stopped' }));
    expect(listedNames()).toEqual(['old']);

    await user.click(screen.getByRole('button', { name: 'All' }));
    await user.type(
      screen.getByPlaceholderText('Search containers...'),
      'REDIS'
    );
    expect(listedNames()).toEqual(['cache']);
  });

  it('never acts on containers the filter hides', async () => {
    const user = userEvent.setup();
    const sent = mockEngine([web, cache, old], {
      bulk_stop_containers: succeedsFor,
    });
    await renderPage();

    await user.click(
      screen.getByRole('checkbox', { name: 'Select all containers' })
    );
    await user.click(screen.getByRole('button', { name: 'Running' }));
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(sentBy(sent, 'bulk_stop_containers')).toEqual([
      { ids: ['cache-id', 'web-id'] },
    ]);
  });

  it('forgets a selected container that a pushed snapshot removes', async () => {
    const user = userEvent.setup();
    const sent = mockEngine([web, old, stale], {
      bulk_remove_containers: succeedsFor,
    });
    await renderPage();

    await user.click(screen.getByRole('checkbox', { name: 'Select old' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select stale' }));

    await act(() => emit('engine_state_update', snapshot(2, [web, old])));
    expect(listedNames()).toEqual(['old', 'web']);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(sentBy(sent, 'bulk_remove_containers')).toEqual([
      { ids: ['old-id'] },
    ]);
  });
});
