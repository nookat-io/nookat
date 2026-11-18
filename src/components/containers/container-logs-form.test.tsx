import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContainerLogsForm } from './container-logs-form';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

function mockLogReads(readLogs: (id: string) => Promise<string[]>) {
  const reads: string[] = [];
  mockIPC((cmd, args) => {
    if (cmd !== 'container_logs') {
      throw new Error(`Unexpected command ${cmd}`);
    }
    const { id } = args as { id: string };
    reads.push(id);
    return readLogs(id);
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
    expect(reads).toEqual(['c0ffee']);
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
    expect(reads).toEqual(['c0ffee', 'c0ffee']);
  });

  it('shows no logs and a toast when the logs cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLogReads(async () => {
      throw new Error('container is gone');
    });

    renderLogs();

    expect(await screen.findByText('No logs found')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Failed to fetch logs');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  });
});
