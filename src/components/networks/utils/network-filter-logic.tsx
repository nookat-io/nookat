import { ReactNode } from 'react';
import { NetworkData } from '../network-data-provider';
import { NetworkFilter } from '../use-network-page-state';

interface NetworkFilterLogicProps {
  networks: NetworkData[];
  filter: NetworkFilter;
  searchTerm: string;
  children: (filteredNetworks: NetworkData[]) => ReactNode;
}

export function NetworkFilterLogic({
  networks,
  filter,
  searchTerm,
  children,
}: NetworkFilterLogicProps) {
  const networksArray = networks || [];

  const filteredNetworks = networksArray.filter(network => {
    // Search term filtering
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        network.name.toLowerCase().includes(searchLower) ||
        network.driver.toLowerCase().includes(searchLower) ||
        network.scope.toLowerCase().includes(searchLower) ||
        (network.subnet &&
          network.subnet.toLowerCase().includes(searchLower)) ||
        (network.gateway &&
          network.gateway.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
    }

    // Filter by driver
    if (filter.driver && network.driver !== filter.driver) {
      return false;
    }

    // Filter by scope
    if (filter.scope && network.scope !== filter.scope) {
      return false;
    }

    // Filter by internal status
    if (filter.internal !== undefined && network.internal !== filter.internal) {
      return false;
    }

    return true;
  });

  return <>{children(filteredNetworks)}</>;
}
