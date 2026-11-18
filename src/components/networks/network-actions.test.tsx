import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkActions } from './network-actions';
import { NetworksTable } from './networks-table';
import { Network } from './network-types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const backendNetwork: Network = {
  id: 'f00d',
  name: 'backend',
  driver: 'bridge',
  scope: 'local',
  containers: 0,
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

describe('network deletion errors', () => {
  beforeEach(() => {
    toast.error.mockClear();
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

  it('shows the reason the backend gives when deleting the selected networks fails', async () => {
    const user = userEvent.setup();
    mockNetworkRemovalFailing('Cannot remove system network: bridge');
    render(<NetworkActions selectedNetworks={['bridge', 'backend']} />);

    await user.click(screen.getByRole('button', { name: 'Delete Selected' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Cannot remove system network: bridge'
    );
  });
});
