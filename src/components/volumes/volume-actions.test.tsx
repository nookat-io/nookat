import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VolumeActions } from './volume-actions';

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
