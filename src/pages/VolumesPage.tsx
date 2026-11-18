import { VolumeHeader } from '../components/volumes/volume-header';
import { VolumeControls } from '../components/volumes/volume-controls';
import { VolumesTable } from '../components/volumes/volumes-table';
import { usePageState } from '../hooks/use-page-state';
import { useEngineState } from '../hooks/use-engine-state';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-analytics';
import {
  VolumeFilter,
  volumeFilter,
} from '../components/volumes/volume-filter';

export default function VolumesPage() {
  usePageAnalytics('volumes');

  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = usePageState<VolumeFilter>('all');

  const { engineState, isLoading, error } = useEngineState();

  const volumes = engineState ? Object.values(engineState.volumes) : [];

  const filteredVolumes = useFilter(volumes, filter, searchTerm, volumeFilter);

  return (
    <PageLayout
      header={
        <VolumeHeader
          selectedVolumes={selected}
          volumes={volumes}
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
          isLoading={isLoading}
          error={error}
          onRetry={() => window.location.reload()}
        />
      }
    />
  );
}
