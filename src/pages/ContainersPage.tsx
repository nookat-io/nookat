import { ContainerHeader } from '../components/containers/container-header';
import { ContainerControls } from '../components/containers/container-controls';
import { ContainersTable } from '../components/containers/containers-table';
import { usePageState } from '../hooks/use-page-state';
import { useEngineState } from '../hooks/use-engine-state';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-analytics';
import { Container } from '../components/containers/container-types';

export default function ContainersPage() {
  usePageAnalytics('containers');

  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = usePageState<'all' | 'running' | 'stopped'>('all');

  const { engineState, isLoading, error } = useEngineState();

  // Convert containers from Record to array for compatibility
  const containers = engineState ? Object.values(engineState.containers) : [];

  const filteredContainers = useFilter<Container>(
    containers,
    filter,
    searchTerm,
    {
      searchFields: ['names', 'image'],
      filterField: 'state',
    }
  );

  return (
    <PageLayout
      header={
        <ContainerHeader
          selectedContainers={selected}
          containers={containers}
          onActionComplete={() => {}}
          onSelectionChange={setSelected}
        />
      }
      controls={
        <ContainerControls
          filter={filter}
          onFilterChange={setFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      }
      table={
        <ContainersTable
          selectedContainers={selected}
          onSelectionChange={setSelected}
          containers={filteredContainers}
          onActionComplete={() => {}}
          isLoading={isLoading}
          error={error}
          onRetry={() => window.location.reload()}
        />
      }
    />
  );
}
