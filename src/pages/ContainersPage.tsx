import { ContainerData } from '../components/containers/container-types';
import { ContainerHeader } from '../components/containers/container-header';
import { ContainerControls } from '../components/containers/container-controls';
import { ContainersTable } from '../components/containers/containers-table';
import { usePageState } from '../hooks/use-page-state';
import { useDataProvider } from '../hooks/use-data-provider';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-page-analytics';

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

  const {
    data: containers,
    isLoading,
    error,
    refresh,
  } = useDataProvider<ContainerData>('list_containers');

  const filteredContainers = useFilter(containers, filter, searchTerm, {
    searchFields: ['names', 'image'],
    filterField: 'state',
  });

  return (
    <PageLayout
      header={
        <ContainerHeader
          selectedContainers={selected}
          containers={containers}
          onActionComplete={refresh}
          onSelectionChange={setSelected}
        />
      }
      controls={
        <div className="space-y-4">
          <ContainerControls
            filter={filter}
            onFilterChange={setFilter}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>
      }
      table={
        <ContainersTable
          selectedContainers={selected}
          onSelectionChange={setSelected}
          containers={filteredContainers}
          onActionComplete={refresh}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
        />
      }
    />
  );
}
