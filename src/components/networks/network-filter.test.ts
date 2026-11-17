import { describe, expect, it } from 'vitest';
import { networkFilter } from './network-filter';
import { Network } from './network-types';

const networks = ['bridge', 'host', 'none', 'app_default', 'bridge_net'].map(
  name => ({ id: name, name }) as Network
);

const idsMatching = (filter: 'system' | 'others') =>
  networks.filter(networkFilter.matches[filter]).map(network => network.id);

describe('networkFilter', () => {
  it('splits the networks Docker creates from user-created ones', () => {
    expect(idsMatching('system')).toEqual(['bridge', 'host', 'none']);
    expect(idsMatching('others')).toEqual(['app_default', 'bridge_net']);
  });
});
