import { VolumeActions } from './actions';
import { VolumeData } from './data/volume-data-provider';

interface VolumeHeaderProps {
  selectedVolumes: string[];
  volumes: VolumeData[];
  onActionComplete: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

export function VolumeHeader({
  selectedVolumes,
  volumes,
  onActionComplete,
  onSelectionChange,
}: VolumeHeaderProps) {
  return (
    <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col items-start justify-start">
          <h1 className="text-3xl font-bold bg-clip-text">Volumes</h1>
          <p className="text-muted-foreground mt-2">
            Manage your volumes
            {volumes.length > 0 &&
              ` - ${volumes.length} volume${volumes.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="flex items-start">
          <VolumeActions
            selectedVolumes={selectedVolumes}
            onActionComplete={onActionComplete}
            onSelectionChange={onSelectionChange}
          />
        </div>
      </div>
    </div>
  );
}
