import { useState } from 'react';
import { NetworksTable } from '../components/networks/networks-table';
import { NetworkActions } from '../components/networks/network-actions';

export default function NetworksPage() {
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);

  return (
    <div className="page-background min-h-screen">
      <div className="space-y-6 p-6 max-w-full">
        <div className="flex items-center justify-between">
          <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col items-start justify-start">
                <h1 className="text-3xl font-bold bg-clip-text">Networks</h1>
                <p className="text-muted-foreground mt-2">
                  Manage Docker networks and container connectivity
                </p>
              </div>
              <div className="flex items-start">
                <NetworkActions selectedNetworks={selectedNetworks} />
              </div>
            </div>
          </div>
        </div>

        <div className="content-section">
          <NetworksTable
            selectedNetworks={selectedNetworks}
            onSelectionChange={setSelectedNetworks}
          />
        </div>
      </div>
    </div>
  );
}
