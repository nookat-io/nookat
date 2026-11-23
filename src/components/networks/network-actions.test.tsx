import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkActions } from './network-actions';
import { NetworksTable } from './networks-table';
import { Network } from './network-types';
import { BulkOutcome } from '../../types/bulk-outcome';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const backendNetwork: Network = {
  id: 'f00d',
  name: 'backend',
  driver: 'bridge',
  scope: 'local',
  in_use: false,
  internal: false,
  ipam: {},
};

function mockNetworkRemovalFailing(reason: string) {
  mockIPC(cmd => {
    if (cmd === 'remove_network' || cmd === 'bulk_remove_networks') {
      return Promise.reject(reason);
    }
    throw new Error(`Unexpected command ${cmd}`);
  });
}

function mockBulkRemovalOutcome(outcome: BulkOutcome) {
  mockIPC(cmd => {
    if (cmd === 'bulk_remove_networks') {
      return outcome;
    }
    throw new Error(`Unexpected command ${cmd}`);
  });
}

describe('network deletion errors', () => {
  beforeEach(() => {
    toast.error.mockClear();
    toast.success.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows the reason the backend gives when deleting one network fails', async () => {
    const user = userEvent.setup();
    mockNetworkRemovalFailing(
      'Failed to remove network backend: network backend has active endpoints'
    );
    render(
      <NetworksTable
        selectedNetworks={[]}
        onSelectionChange={() => {}}
        networks={[backendNetwork]}
      />
    );

    const row = screen.getByRole('row', { name: /backend/ });
    await user.click(within(row).getByRole('button'));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to remove network backend: network backend has active endpoints'
    );
  });

  it('explains why Delete is unavailable for a network in use', async () => {
    const user = userEvent.setup();
    render(
      <NetworksTable
        selectedNetworks={[]}
        onSelectionChange={() => {}}
        networks={[{ ...backendNetwork, in_use: true }]}
      />
    );

    const row = screen.getByRole('row', { name: /backend/ });
    await user.click(within(row).getByRole('button'));

    expect(
      await screen.findByRole('menuitem', { name: 'Delete' })
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('In use by a running container')
    ).toBeInTheDocument();
  });

  it('selects networks by name', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <NetworksTable
        selectedNetworks={[]}
        onSelectionChange={onSelectionChange}
        networks={[backendNetwork]}
      />
    );

    const row = screen.getByRole('row', { name: /backend/ });
    await user.click(within(row).getByRole('checkbox'));

    expect(onSelectionChange).toHaveBeenCalledWith(['backend']);
  });

  it('keeps only the networks that failed selected', async () => {
    const user = userEvent.setup();
    const reason =
      'Failed to remove network backend: error while removing network: network backend has active endpoints';
    mockBulkRemovalOutcome({
      succeeded: ['frontend'],
      failed: [{ id: 'backend', error: reason }],
    });
    const onSelectionChange = vi.fn();
    render(
      <NetworkActions
        selectedNetworks={['backend', 'frontend']}
        networkNames={['backend', 'frontend']}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Selected' }));

    expect(onSelectionChange).toHaveBeenCalledWith(['backend']);
    expect(toast.error).toHaveBeenCalledWith(
      `Failed to delete 1 of 2 networks: ${reason}`
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('reports how many networks were deleted', async () => {
    const user = userEvent.setup();
    mockBulkRemovalOutcome({
      succeeded: ['backend', 'frontend'],
      failed: [],
    });
    const onSelectionChange = vi.fn();
    render(
      <NetworkActions
        selectedNetworks={['backend', 'frontend']}
        networkNames={['backend', 'frontend']}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Selected' }));

    expect(toast.success).toHaveBeenCalledWith('Deleted 2 networks');
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('shows the reason the backend gives when deleting the selected networks fails', async () => {
    const user = userEvent.setup();
    mockNetworkRemovalFailing('Docker not found');
    render(
      <NetworkActions
        selectedNetworks={['frontend', 'backend']}
        networkNames={['frontend', 'backend']}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Selected' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to delete 2 networks: Docker not found'
    );
  });
});
