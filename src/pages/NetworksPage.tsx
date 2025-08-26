import { NetworkHeader } from '../components/networks/network-header';
import { NetworkControls } from '../components/networks/network-controls';
import { NetworksTable } from '../components/networks/networks-table';
import { usePageState } from '../hooks/use-page-state';
import { useEngineState } from '../hooks/use-engine-state';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-analytics';
import { Network } from '../components/networks/network-types';

export default function NetworksPage() {
  usePageAnalytics('networks');

  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = usePageState<'all' | 'system' | 'others'>('all');

  const { engineState, isLoading, error } = useEngineState();

  // Convert networks from Record to array for compatibility
  const networks = engineState ? Object.values(engineState.networks) : [];

  const filteredNetworks = useFilter<Network>(networks, filter, searchTerm, {
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
          onActionComplete={() => {}} // No longer needed with WebSocket updates
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
          onActionComplete={() => {}} // No longer needed with WebSocket updates
          isLoading={isLoading}
          error={error}
          onRetry={() => window.location.reload()}
        />
      }
    />
  );
}
