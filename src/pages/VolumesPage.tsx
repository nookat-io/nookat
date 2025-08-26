import { VolumeHeader } from '../components/volumes/volume-header';
import { VolumeControls } from '../components/volumes/volume-controls';
import { VolumesTable } from '../components/volumes/volumes-table';
import { usePageState } from '../hooks/use-page-state';
import { useEngineState } from '../hooks/use-engine-state';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-analytics';
import { Volume } from '../components/volumes/volume-types';

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

  const { engineState, isLoading, error } = useEngineState();

  // Convert volumes from Record to array for compatibility
  const volumes = engineState ? Object.values(engineState.volumes) : [];

  const filteredVolumes = useFilter<Volume>(volumes, filter, searchTerm, {
    searchFields: ['name', 'driver'],
    filterField: 'usage_data',
  });

  return (
    <PageLayout
      header={
        <VolumeHeader
          selectedVolumes={selected}
          volumes={volumes}
          onActionComplete={() => {}} // No longer needed with WebSocket updates
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
          onActionComplete={() => {}} // No longer needed with WebSocket updates
          isLoading={isLoading}
          error={error}
          onRetry={() => window.location.reload()}
        />
      }
    />
  );
}
