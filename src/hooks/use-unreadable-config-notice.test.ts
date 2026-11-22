import { renderHook, waitFor } from '@testing-library/react';
import { mockIPC } from '@tauri-apps/api/mocks';
import { describe, expect, it, vi } from 'vitest';
import { useUnreadableConfigNotice } from './use-unreadable-config-notice';

const toast = vi.hoisted(() => ({ warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

function answerBackupQuery(answer: () => unknown) {
  const queries = vi.fn(answer);
  mockIPC(cmd => {
    if (cmd === 'get_unreadable_config_backup') {
      return queries();
    }
  });
  return queries;
}

describe('useUnreadableConfigNotice', () => {
  it('warns once with the path of the kept copy when the settings file could not be read', async () => {
    const backup = '/home/user/.nookat/config.json.corrupt-20261122T153000Z';
    answerBackupQuery(() => backup);

    renderHook(() => useUnreadableConfigNotice(true));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(1));
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining(backup),
      expect.objectContaining({ duration: Infinity, closeButton: true })
    );
  });

  it('stays quiet when the settings file was read normally', async () => {
    const queries = answerBackupQuery(() => null);

    renderHook(() => useUnreadableConfigNotice(true));

    await waitFor(() => expect(queries).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('stays quiet when the backend cannot answer', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    answerBackupQuery(() => {
      throw new Error('backend unavailable');
    });

    renderHook(() => useUnreadableConfigNotice(true));

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(toast.warning).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('waits until the settings have loaded before asking', async () => {
    const queries = answerBackupQuery(() => null);

    const { rerender } = renderHook(
      ({ enabled }) => useUnreadableConfigNotice(enabled),
      { initialProps: { enabled: false } }
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(queries).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(queries).toHaveBeenCalledTimes(1));
  });
});
