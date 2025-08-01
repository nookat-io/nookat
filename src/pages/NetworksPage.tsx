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
      {({ networks, refreshNetworks, isLoading, error }) => (
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
                    isLoading={isLoading}
                    error={error}
                    onRetry={refreshNetworks}
                  />
                </div>
              )}
            </NetworkFilterLogic>
          </div>
        </div>
      )}
    </NetworkDataProvider>
  );
}
