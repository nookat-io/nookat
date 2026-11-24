import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Network } from './network-types';
import { NetworksTable } from './networks-table';

function aNetwork(name: string): Network {
  return {
    id: `${name}-id`,
    name,
    driver: 'bridge',
    scope: 'local',
    in_use: false,
    internal: false,
    ipam: {},
  };
}

const networks = [aNetwork('bridge'), aNetwork('app'), aNetwork('zeta')];

function renderedNetworkNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map(row => row.querySelector('td[title]')?.getAttribute('title'));
}

describe('NetworksTable', () => {
  it('sorts by the Type column with custom networks first, then system networks first', async () => {
    const user = userEvent.setup();
    render(
      <NetworksTable
        selectedNetworks={[]}
        onSelectionChange={() => {}}
        networks={networks}
        emptyState={null}
      />
    );

    expect(renderedNetworkNames()).toEqual(['app', 'bridge', 'zeta']);

    await user.click(screen.getByRole('columnheader', { name: 'Type' }));
    expect(renderedNetworkNames()).toEqual(['app', 'zeta', 'bridge']);

    await user.click(screen.getByRole('columnheader', { name: 'Type' }));
    expect(renderedNetworkNames()).toEqual(['bridge', 'app', 'zeta']);
  });
});
