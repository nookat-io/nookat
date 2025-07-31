import {
  VolumeDataProvider,
  VolumeFilterLogic,
  VolumeHeader,
  VolumeControls,
  VolumesTable,
  useVolumePageState,
} from '../components/volumes';
import { PageWrapper } from '../components/ui/page-wrapper';

export default function VolumesPage() {
  const {
    selectedVolumes,
    setSelectedVolumes,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = useVolumePageState();

  return (
    <VolumeDataProvider>
      {({ volumes, refreshVolumes, isLoading, error }) => (
        <PageWrapper
          isLoading={isLoading}
          error={error}
          onRetry={refreshVolumes}
          loadingMessage="Loading volumes..."
          fullScreenLoading={true}
          fullScreenError={true}
        >
          <div className="page-background min-h-screen flex flex-col">
            {/* Sticky header section */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="space-y-6 p-6 max-w-full">
                <VolumeHeader
                  selectedVolumes={selectedVolumes}
                  volumes={volumes}
                  onActionComplete={refreshVolumes}
                  onSelectionChange={setSelectedVolumes}
                />

                <VolumeControls
                  filter={filter}
                  onFilterChange={setFilter}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                />
              </div>
            </div>

            {/* Scrollable table section */}
            <div className="flex-1 overflow-hidden">
              <VolumeFilterLogic
                volumes={volumes}
                filter={filter}
                searchTerm={searchTerm}
              >
                {filteredVolumes => (
                  <div className="p-6 max-w-full h-full overflow-auto">
                    <VolumesTable
                      selectedVolumes={selectedVolumes}
                      onSelectionChange={setSelectedVolumes}
                      volumes={filteredVolumes}
                      onActionComplete={refreshVolumes}
                    />
                  </div>
                )}
              </VolumeFilterLogic>
            </div>
          </div>
        </PageWrapper>
      )}
    </VolumeDataProvider>
  );
}
