import {
  act,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VolumeActions } from './volume-actions';
import { useVolumeSizes } from './volume-actions-service';
import { VolumesTable } from './volumes-table';
import { Volume, VolumeScope, VolumeSizes } from './volume-types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

function mockVolumeCommands(
  handlers: Partial<Record<string, (args: Record<string, unknown>) => unknown>>
) {
  mockIPC((cmd, args) => {
    const handler = handlers[cmd];
    if (!handler) {
      throw new Error(`Unexpected command ${cmd}`);
    }
    return handler(args as Record<string, unknown>);
  });
}

const IN_USE = 'Failed to remove volume b: volume is in use';

describe('volume actions', () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('keeps only the volumes it could not delete selected', async () => {
    const user = userEvent.setup();
    mockVolumeCommands({
      bulk_remove_volumes: () => ({
        succeeded: ['a', 'c'],
        failed: [{ id: 'b', error: IN_USE }],
      }),
    });
    const onSelectionChange = vi.fn();
    render(
      <VolumeActions
        selectedVolumes={['a', 'b', 'c']}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(toast.error).toHaveBeenCalledWith(
      `Failed to delete 1 of 3 volumes: ${IN_USE}`
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenCalledWith(['b']);
  });

  it('clears the selection after deleting every volume', async () => {
    const user = userEvent.setup();
    mockVolumeCommands({
      bulk_remove_volumes: () => ({ succeeded: ['a', 'b'], failed: [] }),
    });
    const onSelectionChange = vi.fn();
    render(
      <VolumeActions
        selectedVolumes={['a', 'b']}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(toast.success).toHaveBeenCalledWith('Deleted 2 volumes');
    expect(toast.error).not.toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('reports why the engine could not be reached and keeps the selection', async () => {
    const user = userEvent.setup();
    mockVolumeCommands({
      bulk_remove_volumes: () => Promise.reject('Docker not found'),
    });
    const onSelectionChange = vi.fn();
    render(
      <VolumeActions
        selectedVolumes={['a', 'b']}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to delete 2 volumes: Docker not found'
    );
    expect(onSelectionChange).not.toHaveBeenCalledWith([]);
  });
});

const SIZES_REFRESH_MS = 60_000;

function mockSizesBackend(answers: Array<VolumeSizes | Error>) {
  const requests = { count: 0 };
  mockIPC(cmd => {
    if (cmd !== 'get_volume_sizes') {
      throw new Error(`Unexpected command ${cmd}`);
    }
    const answer = answers[Math.min(requests.count, answers.length - 1)];
    requests.count += 1;
    return answer instanceof Error ? Promise.reject(answer) : answer;
  });
  return requests;
}

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

describe('useVolumeSizes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the daemon once after mount and returns its sizes', async () => {
    const requests = mockSizesBackend([{ data: 52428800 }]);

    const { result } = renderHook(() => useVolumeSizes(['data']));
    await settle();

    expect(requests.count).toBe(1);
    expect(result.current).toEqual({ data: 52428800 });
  });

  it('asks again a minute after the previous answer', async () => {
    const requests = mockSizesBackend([{ data: 1 }, { data: 2 }]);

    const { result } = renderHook(() => useVolumeSizes(['data']));
    await settle();
    await act(() => vi.advanceTimersByTimeAsync(SIZES_REFRESH_MS - 1));
    expect(requests.count).toBe(1);
    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(requests.count).toBe(2);
    expect(result.current).toEqual({ data: 2 });
  });

  it('asks again when a volume is added, but not for the same names in a new array', async () => {
    const requests = mockSizesBackend([{ data: 1 }]);
    const { rerender } = renderHook(
      ({ names }: { names: string[] }) => useVolumeSizes(names),
      { initialProps: { names: ['data', 'cache'] } }
    );
    await settle();

    rerender({ names: ['cache', 'data'] });
    await settle();
    expect(requests.count).toBe(1);

    rerender({ names: ['cache', 'data', 'logs'] });
    await settle();
    expect(requests.count).toBe(2);
  });

  it('stops asking after unmount', async () => {
    const requests = mockSizesBackend([{ data: 1 }]);
    const { unmount } = renderHook(() => useVolumeSizes(['data']));
    await settle();

    unmount();
    await act(() => vi.advanceTimersByTimeAsync(SIZES_REFRESH_MS * 3));

    expect(requests.count).toBe(1);
  });

  it('keeps the sizes it has when a later request fails, without a toast', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    toast.error.mockClear();
    mockSizesBackend([{ data: 1 }, new Error('df failed')]);

    const { result } = renderHook(() => useVolumeSizes(['data']));
    await settle();
    await act(() => vi.advanceTimersByTimeAsync(SIZES_REFRESH_MS));

    expect(result.current).toEqual({ data: 1 });
    expect(consoleError).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

const volumeNamed = (name: string): Volume => ({
  name,
  driver: 'local',
  mountpoint: `/var/lib/docker/volumes/${name}/_data`,
  labels: {},
  scope: VolumeScope.Local,
  options: {},
  in_use: false,
});

describe('VolumesTable sizes', () => {
  const renderTable = () =>
    render(
      <VolumesTable
        selectedVolumes={[]}
        onSelectionChange={() => {}}
        volumes={['alpha', 'beta', 'gamma'].map(volumeNamed)}
        sizes={{ alpha: 52428800, beta: 2048 }}
        emptyState={null}
      />
    );

  const rowOf = (name: string) =>
    screen.getByRole('cell', { name }).closest('tr') as HTMLElement;

  const volumeNamesInOrder = () =>
    screen
      .getAllByRole('row')
      .slice(1)
      .map(row => within(row).getAllByRole('cell')[1].textContent);

  it('shows the size the daemon measured, and a dash when it did not', () => {
    renderTable();

    expect(within(rowOf('alpha')).getByText('50 MB')).toBeInTheDocument();
    expect(within(rowOf('beta')).getByText('2 KB')).toBeInTheDocument();
    expect(within(rowOf('gamma')).getByText('-')).toBeInTheDocument();
  });

  it('sorts by size with unmeasured volumes last', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('columnheader', { name: 'Size' }));

    expect(volumeNamesInOrder()).toEqual(['beta', 'alpha', 'gamma']);
  });
});
