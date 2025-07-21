import { useState } from 'react';
import { VolumesTable } from '../components/volumes/volumes-table';
import { VolumeActions } from '../components/volumes/volume-actions';

export default function VolumesPage() {
  const [selectedVolumes, setSelectedVolumes] = useState<string[]>([]);

  return (
    <div className="page-background min-h-screen">
      <div className="space-y-6 p-6 max-w-full">
        <div className="flex items-center justify-between">
          <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col items-start justify-start">
                <h1 className="text-3xl font-bold bg-clip-text">
                  Volumes
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage Docker volumes for persistent data storage
                </p>
              </div>
              <div className="flex items-start">
                <VolumeActions selectedVolumes={selectedVolumes} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="content-section">
          <VolumesTable 
            selectedVolumes={selectedVolumes}
            onSelectionChange={setSelectedVolumes}
          />
        </div>
      </div>
    </div>
  );
} 