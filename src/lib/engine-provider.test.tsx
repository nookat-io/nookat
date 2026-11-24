import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emit } from '@tauri-apps/api/event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
    version,
    last_updated: lastUpdated,
  };
}

function mockEngine({
  pull,
  startMonitoring = () => null,
  readStatus = () => running,
}: {
  pull: () => Promise<EngineState>;
  startMonitoring?: () => unknown;
  readStatus?: () => unknown;
}) {
  let pullRequested!: () => void;
  const requested = new Promise<void>(resolve => (pullRequested = resolve));
  const invocations: string[] = [];
  mockIPC(
    cmd => {
      invocations.push(cmd);
      switch (cmd) {
        case 'engine_status':
          return readStatus();
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
  return {
    pullRequested: requested,
    count: (cmd: string) => invocations.filter(sent => sent === cmd).length,
  };
}

let checkingPerRender: boolean[] = [];

function EngineView() {
  const { engineState, status, isLoading, error, isChecking, refetch } =
    useEngine();
  checkingPerRender.push(isChecking);
  return (
    <ul>
      <li>version: {engineState?.version ?? 'none'}</li>
      <li>
        containers: {Object.keys(engineState?.containers ?? {}).join(',')}
      </li>
      <li>status: {JSON.stringify(status)}</li>
      <li>checking: {String(isChecking)}</li>
      <li>loading: {String(isLoading)}</li>
      <li>error: {error ?? 'none'}</li>
      <li>
        <button onClick={() => refetch()}>check engine</button>
      </li>
    </ul>
  );
}

const field = (name: string) =>
  screen.getByText(new RegExp(`^${name}:`)).textContent;

function renderProvider() {
  checkingPerRender = [];
  render(
    <EngineProvider>
      <EngineView />
    </EngineProvider>
  );
}

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const neverResolves = () => new Promise<never>(() => {});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(settle => (resolve = settle));
  return { promise, resolve };
}

describe('EngineProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

    const removalPushedDuringPull = snapshot({
      version: 2,
      containers: [],
      lastUpdated: '2026-01-01T00:00:01Z',
    });
    await act(() => emit('engine_state_update', removalPushedDuringPull));
    expect(field('version')).toBe('version: 2');

    const stalePullStampedAfterRemoval = snapshot({
      version: 1,
      containers: ['removed'],
      status: 'Unknown',
      lastUpdated: '2026-01-01T00:00:02Z',
    });
    await act(async () => {
      finishPull(stalePullStampedAfterRemoval);
      await flushPromises();
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

  it('reports checking from its very first render until the first status read returns, so the engine error gate does not flash', async () => {
    const statusRead = deferred<EngineStatus>();
    mockEngine({ pull: neverResolves, readStatus: () => statusRead.promise });

    renderProvider();

    expect(checkingPerRender[0]).toBe(true);
    expect(field('checking')).toBe('checking: true');
    await act(async () => statusRead.resolve(running));
    expect(field('checking')).toBe('checking: false');
    expect(field('status')).toBe(`status: ${JSON.stringify(running)}`);
  });

  it('never asks the daemon for its info to tell the engine status', async () => {
    vi.useFakeTimers();
    const engine = mockEngine({ pull: neverResolves });
    renderProvider();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(field('checking')).toBe('checking: false');
    expect(engine.count('get_docker_info')).toBe(0);

    await act(() => vi.advanceTimersByTimeAsync(10_000));

    expect(engine.count('engine_status')).toBeGreaterThan(1);
    expect(engine.count('get_docker_info')).toBe(0);
  });

  it('reads the status every 5 seconds until a snapshot arrives', async () => {
    vi.useFakeTimers();
    const engine = mockEngine({ pull: neverResolves });
    renderProvider();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(engine.count('engine_status')).toBe(1);

    await act(() => vi.advanceTimersByTimeAsync(4999));
    expect(engine.count('engine_status')).toBe(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(engine.count('engine_status')).toBe(2);

    await act(() =>
      emit('engine_state_update', snapshot({ version: 1, containers: [] }))
    );
    await act(() => vi.advanceTimersByTimeAsync(10_000));

    expect(engine.count('engine_status')).toBe(2);
  });

  it('keeps the status of a snapshot that arrives while a status read is in flight', async () => {
    const statusRead = deferred<EngineStatus>();
    const { pullRequested } = mockEngine({
      pull: neverResolves,
      readStatus: () => statusRead.promise,
    });
    renderProvider();
    await act(() => pullRequested);

    await act(() =>
      emit(
        'engine_state_update',
        snapshot({ version: 1, containers: [], status: running })
      )
    );
    await act(async () => {
      statusRead.resolve('Unknown');
      await flushPromises();
    });

    expect(field('status')).toBe(`status: ${JSON.stringify(running)}`);
    expect(field('checking')).toBe('checking: false');
  });

  it('treats a status it does not recognise as unknown', async () => {
    mockEngine({ pull: neverResolves, readStatus: () => ({ Paused: {} }) });

    renderProvider();

    await waitFor(() => expect(field('checking')).toBe('checking: false'));
    expect(field('status')).toBe('status: "Unknown"');
  });

  it('shows checking again while a manual refresh reads the status', async () => {
    const user = userEvent.setup();
    let statusRead = Promise.resolve<EngineStatus>('Unknown');
    mockEngine({ pull: neverResolves, readStatus: () => statusRead });
    renderProvider();
    await waitFor(() => expect(field('checking')).toBe('checking: false'));
    const manualRead = deferred<EngineStatus>();
    statusRead = manualRead.promise;

    await user.click(screen.getByRole('button', { name: 'check engine' }));

    expect(field('checking')).toBe('checking: true');
    await act(async () => manualRead.resolve(running));
    expect(field('checking')).toBe('checking: false');
    expect(field('status')).toBe(`status: ${JSON.stringify(running)}`);
  });
});
