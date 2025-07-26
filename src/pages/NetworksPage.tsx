import {
  NetworkDataProvider,
  NetworkFilterLogic,
  NetworkHeader,
  NetworkControls,
  NetworksTable,
  useNetworkPageState,
} from '../components/networks';

export default function NetworksPage() {
  const {
    selectedNetworks,
    setSelectedNetworks,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = useNetworkPageState();

  return (
    <NetworkDataProvider>
      {({ networks, refreshNetworks, isLoading, error }) => {
        if (isLoading) {
          return (
            <div className="page-background min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading networks...</p>
              </div>
            </div>
          );
        }

        if (error) {
          return (
            <div className="page-background min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-destructive mb-4">
                  Error loading networks: {error}
                </p>
                <button
                  onClick={refreshNetworks}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Retry
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="page-background min-h-screen flex flex-col">
            {/* Sticky header section */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="space-y-6 p-6 max-w-full">
                <NetworkHeader
                  selectedNetworks={selectedNetworks}
                  networks={networks}
                  onActionComplete={refreshNetworks}
                  onSelectionChange={setSelectedNetworks}
                />

                <NetworkControls
                  filter={filter}
                  onFilterChange={setFilter}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                />
              </div>
            </div>

            {/* Scrollable table section */}
            <div className="flex-1 overflow-hidden">
              <NetworkFilterLogic
                networks={networks}
                filter={filter}
                searchTerm={searchTerm}
              >
                {filteredNetworks => (
                  <div className="p-6 max-w-full h-full overflow-auto">
                    <NetworksTable
                      selectedNetworks={selectedNetworks}
                      onSelectionChange={setSelectedNetworks}
                      networks={filteredNetworks}
                      onActionComplete={refreshNetworks}
                    />
                  </div>
                )}
              </NetworkFilterLogic>
            </div>
          </div>
        );
      }}
    </NetworkDataProvider>
  );
}
