import { FilterConfig } from '../../utils/use-filter';
import { Network, isSystemNetwork } from './network-types';

export type NetworkFilter = 'all' | 'system' | 'others';

export const networkFilter: FilterConfig<Network, NetworkFilter> = {
  searchFields: ['name', 'driver'],
  matches: {
    system: isSystemNetwork,
    others: network => !isSystemNetwork(network),
  },
};
