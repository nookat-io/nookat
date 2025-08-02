import { NetworkData } from '../components/networks/network-types';
import { NetworkHeader } from '../components/networks/network-header';
import { NetworkControls } from '../components/networks/network-controls';
import { NetworksTable } from '../components/networks/networks-table';
import { useDataProvider } from '../hooks/use-data-provider';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { useState } from 'react';

export interface NetworkFilter {
  driver?: string;
  scope?: string;
  internal?: boolean;
}

export default function NetworksPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<NetworkFilter>({});
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: networks,
    isLoading,
    error,
    refresh,
  } = useDataProvider<NetworkData>('list_networks');

  const filteredNetworks = useFilter(networks, 'all', searchTerm, {
    searchFields: ['name', 'driver'],
  });

  return (
    <PageLayout
      header={
        <NetworkHeader
          selectedNetworks={selected}
          networks={networks}
          onActionComplete={refresh}
          onSelectionChange={setSelected}
        />
      }
      controls={
        <NetworkControls
          filter={filter}
          onFilterChange={setFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      }
      table={
        <NetworksTable
          selectedNetworks={selected}
          onSelectionChange={setSelected}
          networks={filteredNetworks}
          onActionComplete={refresh}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
        />
      }
    />
  );
}
