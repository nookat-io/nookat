import { act, render, screen, waitFor } from '@testing-library/react';
import { emit } from '@tauri-apps/api/event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { describe, expect, it, vi } from 'vitest';
import { Container } from '../components/containers/container-types';
import { useEngine } from '../hooks/use-engine';
import { EngineState } from '../types/engine-state';
import { EngineStatus } from '../types/engine-status';
import { EngineProvider } from './engine-provider';

const running: EngineStatus = { Running: 'Docker' };

function snapshot({
  version,
  containers,
  status = running,
  lastUpdated = '2026-01-01T00:00:00Z',
}: {
  version: number;
  containers: string[];
  status?: EngineStatus;
  lastUpdated?: string;
}): EngineState {
  return {
    containers: Object.fromEntries(
      containers.map(id => [id, { id } as Container])
    ),
    images: {},
    volumes: {},
    networks: {},
    engine_status: status,
    docker_info: null,
    version,
    last_updated: lastUpdated,
  };
}

/**
 * Mocks the backend commands the provider calls on mount. `pull` answers
 * `get_engine_state`; `pullRequested` resolves once the provider asked for it,
 * which is after it started listening for pushed updates.
 */
function mockEngine({
  pull,
  startMonitoring = () => null,
}: {
  pull: () => Promise<EngineState>;
  startMonitoring?: () => unknown;
}) {
  let pullRequested!: () => void;
  const requested = new Promise<void>(resolve => (pullRequested = resolve));
  mockIPC(
    cmd => {
      switch (cmd) {
        case 'engine_status':
          return running;
        case 'get_docker_info':
          return {};
        case 'start_engine_state_monitoring':
          return startMonitoring();
        case 'get_engine_state':
          pullRequested();
          return pull();
        default:
          throw new Error(`Unexpected command ${cmd}`);
      }
    },
    { shouldMockEvents: true }
  );
  return { pullRequested: requested };
}

function EngineView() {
  const { engineState, status, isLoading, error } = useEngine();
  return (
    <ul>
      <li>version: {engineState?.version ?? 'none'}</li>
      <li>
        containers: {Object.keys(engineState?.containers ?? {}).join(',')}
      </li>
      <li>status: {JSON.stringify(status)}</li>
      <li>loading: {String(isLoading)}</li>
      <li>error: {error ?? 'none'}</li>
    </ul>
  );
}

const field = (name: string) =>
  screen.getByText(new RegExp(`^${name}:`)).textContent;

function renderProvider() {
  render(
    <EngineProvider>
      <EngineView />
    </EngineProvider>
  );
}

/** Lets every pending promise chain, such as a resolved invoke, finish. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('EngineProvider', () => {
  it('shows the snapshot it pulls on mount', async () => {
    mockEngine({
      pull: async () => snapshot({ version: 1, containers: ['web', 'db'] }),
    });

    renderProvider();

    await waitFor(() => expect(field('containers')).toBe('containers: web,db'));
    expect(field('loading')).toBe('loading: false');
    expect(field('error')).toBe('error: none');
  });

  it('applies pushed snapshots', async () => {
    const { pullRequested } = mockEngine({
      pull: async () => snapshot({ version: 1, containers: ['web'] }),
    });
    renderProvider();
    await act(() => pullRequested);
    await waitFor(() => expect(field('version')).toBe('version: 1'));

    await act(() =>
      emit('engine_state_update', snapshot({ version: 2, containers: [] }))
    );

    expect(field('version')).toBe('version: 2');
    expect(field('containers')).toBe('containers: ');
  });

  it('ignores a pulled snapshot that resolves after a newer pushed one', async () => {
    let finishPull!: (state: EngineState) => void;
    const { pullRequested } = mockEngine({
      pull: () => new Promise(resolve => (finishPull = resolve)),
    });
    renderProvider();
    await act(() => pullRequested);

    // The container was removed while the pull was still reading, so the
    // monitor pushes the removal before the pull returns.
    await act(() =>
      emit(
        'engine_state_update',
        snapshot({
          version: 2,
          containers: [],
          lastUpdated: '2026-01-01T00:00:01Z',
        })
      )
    );
    expect(field('version')).toBe('version: 2');

    // The pull read the old state, but its timestamp is taken after the slow
    // read, so it looks newer by time. Only the version tells them apart.
    await act(async () => {
      finishPull(
        snapshot({
          version: 1,
          containers: ['removed'],
          status: 'Unknown',
          lastUpdated: '2026-01-01T00:00:02Z',
        })
      );
      await settle();
    });

    expect(field('version')).toBe('version: 2');
    expect(field('containers')).toBe('containers: ');
    expect(field('status')).toBe(`status: ${JSON.stringify(running)}`);
  });

  it('reports an error when the engine monitor cannot start', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockEngine({
      pull: async () => snapshot({ version: 1, containers: [] }),
      startMonitoring: () => {
        throw new Error('monitor failed');
      },
    });

    renderProvider();

    await waitFor(() =>
      expect(field('error')).toBe(
        'error: Failed to start engine state monitoring'
      )
    );
    expect(field('loading')).toBe('loading: false');
    expect(field('version')).toBe('version: none');
  });
});
