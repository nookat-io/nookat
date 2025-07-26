import { NetworkData } from './network-data-provider';
import { NetworkActions } from './network-actions';

interface NetworkHeaderProps {
  selectedNetworks: string[];
  networks: NetworkData[];
  onActionComplete: () => void;
  onSelectionChange: (selected: string[]) => void;
}

export function NetworkHeader({
  selectedNetworks,
  networks,
  onActionComplete,
  onSelectionChange,
}: NetworkHeaderProps) {
  const networksArray = networks || [];
  const totalNetworks = networksArray.length;
  const customNetworks = networksArray.filter(
    n => n.name !== 'bridge' && n.name !== 'host' && n.name !== 'none'
  ).length;
  const systemNetworks = totalNetworks - customNetworks;

  return (
    <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col items-start justify-start">
          <h1 className="text-3xl font-bold bg-clip-text">Networks</h1>
          <p className="text-muted-foreground mt-2">
            Manage Docker networks and container connectivity
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>{totalNetworks} total</span>
            <span>{customNetworks} custom</span>
            <span>{systemNetworks} system</span>
          </div>
        </div>
        <div className="flex items-start">
          <NetworkActions
            selectedNetworks={selectedNetworks}
            onActionComplete={onActionComplete}
            onSelectionChange={onSelectionChange}
          />
        </div>
      </div>
    </div>
  );
}
