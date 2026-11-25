import { VolumeHeader } from '../components/volumes/volume-header';
import { VolumeControls } from '../components/volumes/volume-controls';
import { VolumesTable } from '../components/volumes/volumes-table';
import { useVolumeSizes } from '../components/volumes/use-volume-sizes';
import { usePageState } from '../hooks/use-page-state';
import { useEngineState } from '../hooks/use-engine-state';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-analytics';
import {
  VolumeFilter,
  volumeFilter,
  volumeFilterPhrases,
} from '../components/volumes/volume-filter';
import { HardDrive } from 'lucide-react';
import { useMemo } from 'react';
import { Command, ListEmptyState } from '../components/common/list-empty-state';

export default function VolumesPage() {
  usePageAnalytics('volumes');

  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    showAll,
  } = usePageState<VolumeFilter>('all');

  const { engineState, isLoading, error } = useEngineState();

  const volumes = useMemo(
    () => (engineState ? Object.values(engineState.volumes) : []),
    [engineState]
  );

  const filteredVolumes = useFilter(volumes, filter, searchTerm, volumeFilter);

  const sizes = useVolumeSizes(volumes.map(volume => volume.name));

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
          sizes={sizes}
          isLoading={isLoading}
          error={error}
          onRetry={() => window.location.reload()}
          emptyState={
            <ListEmptyState
              hasItems={volumes.length > 0}
              icon={HardDrive}
              nothingExistsTitle="No volumes yet"
              nothingExistsDescription={
                <>
                  Volumes show up here once a container mounts one, or when you
                  create one with <Command>docker volume create</Command>.
                </>
              }
              filterPhrases={volumeFilterPhrases}
              filter={filter}
              searchTerm={searchTerm}
              showAllLabel="Show all volumes"
              onShowAll={showAll}
            />
          }
        />
      }
    />
  );
}
