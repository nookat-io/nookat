import { Network } from './network-types';
import { NetworkActions } from './network-actions';

interface NetworkHeaderProps {
  selectedNetworks: string[];
  networks: Network[];
  onActionComplete: () => void;
  onSelectionChange: (selected: string[]) => void;
}

export function NetworkHeader({
  selectedNetworks,
  networks,
  onActionComplete,
  onSelectionChange,
}: NetworkHeaderProps) {
  const totalNetworks = networks.length;

  return (
    <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col items-start justify-start">
          <h1 className="text-3xl font-bold bg-clip-text">Networks</h1>
          <p className="text-muted-foreground mt-2">
            Manage your networks and container connectivity - {totalNetworks}{' '}
            network{totalNetworks !== 1 && 's'} found
          </p>
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
