import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContainerLogsForm } from './container-logs-form';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

interface LogRead {
  id: string;
  lines: number;
}

function mockLogReads(readLogs: (read: LogRead) => Promise<string[]>) {
  const reads: LogRead[] = [];
  mockIPC((cmd, args) => {
    if (cmd !== 'container_logs') {
      throw new Error(`Unexpected command ${cmd}`);
    }
    const read = args as unknown as LogRead;
    reads.push(read);
    return readLogs(read);
  });
  return reads;
}

function pendingRead() {
  let finish!: (lines: string[]) => void;
  const promise = new Promise<string[]>(resolve => (finish = resolve));
  return { promise, finish };
}

function renderLogs() {
  render(
    <ContainerLogsForm
      containerId="c0ffee"
      containerName="web"
      containerState="running"
      isOpen
      onClose={() => {}}
    />
  );
}

describe('ContainerLogsForm', () => {
  beforeEach(() => {
    toast.error.mockClear();
  });

  it('reads the container logs as soon as it opens', async () => {
    const reads = mockLogReads(async () => ['booting', 'listening on :80']);

    renderLogs();

    expect(await screen.findByText(/listening on :80/)).toBeInTheDocument();
    expect(screen.getByText('2 log entries')).toBeInTheDocument();
    expect(reads).toEqual([{ id: 'c0ffee', lines: 1000 }]);
  });

  it('reads the logs again with the picked line count', async () => {
    const user = userEvent.setup();
    const reads = mockLogReads(async () => ['booting']);
    renderLogs();
    await screen.findByText('booting');

    screen.getByRole('combobox', { name: 'Lines' }).focus();
    await user.keyboard('{Enter}');
    await user.click(
      await screen.findByRole('option', { name: 'Last 10,000 lines' })
    );

    await waitFor(() =>
      expect(reads).toEqual([
        { id: 'c0ffee', lines: 1000 },
        { id: 'c0ffee', lines: 10000 },
      ])
    );

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() =>
      expect(reads).toEqual([
        { id: 'c0ffee', lines: 1000 },
        { id: 'c0ffee', lines: 10000 },
        { id: 'c0ffee', lines: 10000 },
      ])
    );
  });

  it('says it is loading until the first read returns, instead of claiming there are no logs', async () => {
    const read = pendingRead();
    mockLogReads(() => read.promise);

    renderLogs();

    expect(await screen.findByText('Loading logs...')).toBeInTheDocument();
    expect(screen.queryByText('No logs found')).not.toBeInTheDocument();
    await act(async () => read.finish(['ready']));
    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.queryByText('Loading logs...')).not.toBeInTheDocument();
  });

  it('reads the logs again on Refresh', async () => {
    const user = userEvent.setup();
    const batches = [['first'], ['first', 'second']];
    const reads = mockLogReads(async () => batches.shift() ?? []);
    renderLogs();
    await screen.findByText('first');

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByText('2 log entries')).toBeInTheDocument();
    expect(reads).toEqual([
      { id: 'c0ffee', lines: 1000 },
      { id: 'c0ffee', lines: 1000 },
    ]);
  });

  it('shows no logs and a toast with the reason the backend gives when the logs cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLogReads(() => Promise.reject('No such container: c0ffee'));

    renderLogs();

    expect(await screen.findByText('No logs found')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      'Failed to fetch logs: No such container: c0ffee'
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  });
});
