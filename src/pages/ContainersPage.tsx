import { ContainerHeader } from '../components/containers/container-header';
import { ContainerControls } from '../components/containers/container-controls';
import { ContainersTable } from '../components/containers/containers-table';
import { usePageState } from '../hooks/use-page-state';
import { useEngineState } from '../hooks/use-engine-state';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-analytics';
import {
  ContainerFilter,
  containerFilter,
  containerFilterPhrases,
} from '../components/containers/container-filter';
import { Container } from 'lucide-react';
import { useMemo } from 'react';
import {
  Command,
  ListEmptyState,
  UiName,
} from '../components/common/list-empty-state';

export default function ContainersPage() {
  usePageAnalytics('containers');

  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    showAll,
  } = usePageState<ContainerFilter>('all');

  const { engineState, isLoading, error } = useEngineState();

  const containers = useMemo(
    () => (engineState ? Object.values(engineState.containers) : []),
    [engineState]
  );

  const filteredContainers = useFilter(
    containers,
    filter,
    searchTerm,
    containerFilter
  );

  return (
    <PageLayout
      header={
        <ContainerHeader
          selectedContainers={selected}
          containers={containers}
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
          isLoading={isLoading}
          error={error}
          onRetry={() => window.location.reload()}
          emptyState={
            <ListEmptyState
              hasItems={containers.length > 0}
              icon={Container}
              nothingExistsTitle="No containers yet"
              nothingExistsDescription={
                <>
                  Create one with <UiName>Create Container</UiName>, or start
                  one from a terminal with <Command>docker run</Command> or{' '}
                  <Command>docker compose up</Command>.
                </>
              }
              filterPhrases={containerFilterPhrases}
              filter={filter}
              searchTerm={searchTerm}
              showAllLabel="Show all containers"
              onShowAll={showAll}
            />
          }
        />
      }
    />
  );
}
