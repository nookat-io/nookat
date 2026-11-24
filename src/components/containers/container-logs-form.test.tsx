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

interface LogSave {
  fileName: string;
  lines: string[];
}

function mockLogReads(
  readLogs: (read: LogRead) => Promise<string[]>,
  saveLogs?: (save: LogSave) => Promise<string | null>
) {
  const reads: LogRead[] = [];
  mockIPC((cmd, args) => {
    if (cmd === 'container_logs') {
      const read = args as unknown as LogRead;
      reads.push(read);
      return readLogs(read);
    }
    if (cmd === 'save_container_logs' && saveLogs) {
      return saveLogs(args as unknown as LogSave);
    }
    throw new Error(`Unexpected command ${cmd}`);
  });
  return reads;
}

function recordSaves(answer: () => Promise<string | null>) {
  const saves: LogSave[] = [];
  const saveLogs = (save: LogSave) => {
    saves.push(save);
    return answer();
  };
  return { saves, saveLogs };
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
    toast.success.mockClear();
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

  it('shows the logs of the newest read when an older read finishes after it', async () => {
    const user = userEvent.setup();
    const tenThousandLines = pendingRead();
    const oneThousandLines = pendingRead();
    const pendingByCount = new Map([
      [10000, tenThousandLines],
      [1000, oneThousandLines],
    ]);
    let isFirstRead = true;
    mockLogReads(({ lines }) => {
      if (isFirstRead) {
        isFirstRead = false;
        return Promise.resolve(['booting']);
      }
      return pendingByCount.get(lines)!.promise;
    });
    renderLogs();
    await screen.findByText('booting');

    const pickLineCount = async (name: string) => {
      screen.getByRole('combobox', { name: 'Lines' }).focus();
      await user.keyboard('{Enter}');
      await user.click(await screen.findByRole('option', { name }));
    };
    await pickLineCount('Last 10,000 lines');
    await pickLineCount('Last 1,000 lines');

    await act(async () => oneThousandLines.finish(['newest read']));
    await act(async () =>
      tenThousandLines.finish(['older read', 'older read again'])
    );

    expect(await screen.findByText('newest read')).toBeInTheDocument();
    expect(screen.queryByText(/older read/)).not.toBeInTheDocument();
    expect(screen.getByText('1 log entries')).toBeInTheDocument();
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

  it('saves the lines it shows to the file the user picks', async () => {
    const user = userEvent.setup();
    const { saves, saveLogs } = recordSaves(
      async () => '/home/me/web-logs.txt'
    );
    mockLogReads(async () => ['booting', 'listening on :80'], saveLogs);
    renderLogs();
    await screen.findByText(/listening on :80/);

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Saved the logs to /home/me/web-logs.txt'
      )
    );
    expect(saves).toEqual([
      { fileName: 'web-logs.txt', lines: ['booting', 'listening on :80'] },
    ]);
  });

  it('keeps Download disabled until the save finishes', async () => {
    const user = userEvent.setup();
    let finishSave!: (path: string) => void;
    const save = new Promise<string>(resolve => (finishSave = resolve));
    mockLogReads(
      async () => ['booting'],
      () => save
    );
    renderLogs();
    await screen.findByText('booting');
    const download = screen.getByRole('button', { name: 'Download' });

    await user.click(download);

    await waitFor(() => expect(download).toBeDisabled());
    await act(async () => finishSave('/home/me/web-logs.txt'));
    await waitFor(() => expect(download).toBeEnabled());
  });

  it('says nothing when the user cancels the save dialog', async () => {
    const user = userEvent.setup();
    const { saves, saveLogs } = recordSaves(async () => null);
    mockLogReads(async () => ['booting'], saveLogs);
    renderLogs();
    await screen.findByText('booting');
    const download = screen.getByRole('button', { name: 'Download' });

    await user.click(download);

    await waitFor(() => expect(saves).toHaveLength(1));
    await waitFor(() => expect(download).toBeEnabled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows the reason when the logs cannot be saved', async () => {
    const user = userEvent.setup();
    const denied = '/root/web-logs.txt: Permission denied (os error 13)';
    mockLogReads(
      async () => ['booting'],
      () => Promise.reject(denied)
    );
    renderLogs();
    await screen.findByText('booting');

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to save logs: /root/web-logs.txt: Permission denied (os error 13)'
      )
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('copies the lines it shows and confirms it once the clipboard has them', async () => {
    const user = userEvent.setup();
    mockLogReads(async () => ['booting', 'listening on :80']);
    renderLogs();
    await screen.findByText(/listening on :80/);

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Logs copied to clipboard')
    );
    await expect(navigator.clipboard.readText()).resolves.toBe(
      'booting\nlistening on :80'
    );
  });

  it('reports a clipboard failure instead of claiming the logs were copied', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('Document is not focused.')
    );
    mockLogReads(async () => ['booting']);
    renderLogs();
    await screen.findByText('booting');

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to copy logs: Document is not focused.'
      )
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('offers no Copy or Download while there are no lines', async () => {
    mockLogReads(async () => []);

    renderLogs();

    expect(await screen.findByText('No logs found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
  });
});
