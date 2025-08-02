import { NetworkData } from '../components/networks/network-types';
import { NetworkHeader } from '../components/networks/network-header';
import { NetworkControls } from '../components/networks/network-controls';
import { NetworksTable } from '../components/networks/networks-table';
import { useDataProvider } from '../hooks/use-data-provider';
import { useFilter } from '../utils/use-filter';
import { usePageState } from '../hooks/use-page-state';
import { PageLayout } from '../components/layout/page-layout';

export default function NetworksPage() {
  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = usePageState<'all' | 'system' | 'others'>('all');

  const {
    data: networks,
    isLoading,
    error,
    refresh,
  } = useDataProvider<NetworkData>('list_networks');

  const filteredNetworks = useFilter(networks, filter, searchTerm, {
    searchFields: ['name', 'driver'],
    filterField: 'name',
    filterValue: filter === 'system' ? ['bridge', 'host', 'none'] : undefined,
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
