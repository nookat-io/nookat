import { VolumeData } from '../components/volumes/volume-types';
import { VolumeHeader } from '../components/volumes/volume-header';
import { VolumeControls } from '../components/volumes/volume-controls';
import { VolumesTable } from '../components/volumes/volumes-table';
import { usePageState } from '../hooks/use-page-state';
import { useDataProvider } from '../hooks/use-data-provider';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-page-analytics';

export default function VolumesPage() {
  usePageAnalytics('volumes');

  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = usePageState<'all' | 'used' | 'unused'>('all');

  const {
    data: volumes,
    isLoading,
    error,
    refresh,
  } = useDataProvider<VolumeData>('list_volumes');

  const filteredVolumes = useFilter(volumes, filter, searchTerm, {
    searchFields: ['name', 'driver'],
    filterField: 'usage_data',
  });

  return (
    <PageLayout
      header={
        <VolumeHeader
          selectedVolumes={selected}
          volumes={volumes}
          onActionComplete={refresh}
          onSelectionChange={setSelected}
        />
      }
      controls={
        <VolumeControls
          filter={filter}
          onFilterChange={setFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      }
      table={
        <VolumesTable
          selectedVolumes={selected}
          onSelectionChange={setSelected}
          volumes={filteredVolumes}
          onActionComplete={refresh}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
        />
      }
    />
  );
}
