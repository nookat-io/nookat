import {
  ContainerDataProvider,
  ContainerFilterLogic,
  ContainerHeader,
  ContainerControls,
  ContainersTable,
  useContainerPageState,
} from '../components/containers';

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
      {({ containers }) => (
        <div className="page-background min-h-screen">
          <div className="space-y-6 p-6 max-w-full">
            <ContainerHeader selectedContainers={selectedContainers} />
            
            <ContainerControls
              filter={filter}
              onFilterChange={setFilter}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />

            <ContainerFilterLogic
              containers={containers}
              filter={filter}
              searchTerm={searchTerm}
            >
              {(filteredContainers) => (
                <div className="content-section">
                  <ContainersTable
                    filter={filter}
                    selectedContainers={selectedContainers}
                    onSelectionChange={setSelectedContainers}
                    containers={filteredContainers}
                  />
                </div>
              )}
            </ContainerFilterLogic>
          </div>
        </div>
      )}
    </ContainerDataProvider>
  );
} 