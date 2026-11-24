import { NetworkHeader } from '../components/networks/network-header';
import { NetworkControls } from '../components/networks/network-controls';
import { NetworksTable } from '../components/networks/networks-table';
import { usePageState } from '../hooks/use-page-state';
import { useEngineState } from '../hooks/use-engine-state';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-analytics';
import {
  NetworkFilter,
  networkFilter,
  networkFilterPhrases,
} from '../components/networks/network-filter';
import { Network } from 'lucide-react';
import { useMemo } from 'react';
import { ListEmptyState, UiName } from '../components/common/list-empty-state';

export default function NetworksPage() {
  usePageAnalytics('networks');

  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    showAll,
  } = usePageState<NetworkFilter>('all');

  const { engineState, isLoading, error } = useEngineState();

  const networks = useMemo(
    () => (engineState ? Object.values(engineState.networks) : []),
    [engineState]
  );

  const filteredNetworks = useFilter(
    networks,
    filter,
    searchTerm,
    networkFilter
  );

  return (
    <PageLayout
      header={
        <NetworkHeader
          selectedNetworks={selected}
          networks={networks}
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
          isLoading={isLoading}
          error={error}
          onRetry={() => window.location.reload()}
          emptyState={
            <ListEmptyState
              hasItems={networks.length > 0}
              icon={Network}
              nothingExistsTitle="No networks"
              nothingExistsDescription={
                <>
                  Create one with <UiName>Create Network</UiName>.
                </>
              }
              filterPhrases={networkFilterPhrases}
              filter={filter}
              searchTerm={searchTerm}
              showAllLabel="Show all networks"
              onShowAll={showAll}
            />
          }
        />
      }
    />
  );
}
