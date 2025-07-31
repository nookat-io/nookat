import {
  ContainerDataProvider,
  ContainerFilterLogic,
  ContainerHeader,
  ContainerControls,
  ContainersTable,
  useContainerPageState,
} from '../components/containers';
import { PageWrapper } from '../components/ui/page-wrapper';

export default function ContainersPage() {
  const {
    selectedContainers,
    setSelectedContainers,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = useContainerPageState();

  return (
    <ContainerDataProvider>
      {({ containers, refreshContainers, isLoading, error }) => (
        <PageWrapper
          isLoading={isLoading}
          error={error}
          onRetry={refreshContainers}
          loadingMessage="Loading containers..."
          fullScreenLoading={true}
          fullScreenError={true}
        >
          <div className="page-background min-h-screen flex flex-col">
            {/* Sticky header section */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="space-y-6 p-6 max-w-full">
                <ContainerHeader
                  selectedContainers={selectedContainers}
                  containers={containers}
                  onActionComplete={refreshContainers}
                  onSelectionChange={setSelectedContainers}
                />

                <ContainerControls
                  filter={filter}
                  onFilterChange={setFilter}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                />
              </div>
            </div>

            {/* Scrollable table section */}
            <div className="flex-1 overflow-hidden">
              <ContainerFilterLogic
                containers={containers}
                filter={filter}
                searchTerm={searchTerm}
              >
                {filteredContainers => (
                  <div className="p-6 max-w-full h-full overflow-auto">
                    <ContainersTable
                      filter={filter}
                      selectedContainers={selectedContainers}
                      onSelectionChange={setSelectedContainers}
                      containers={filteredContainers}
                      onActionComplete={refreshContainers}
                    />
                  </div>
                )}
              </ContainerFilterLogic>
            </div>
          </div>
        </PageWrapper>
      )}
    </ContainerDataProvider>
  );
}
