import { useState } from 'react';
import { ContainersTable } from '../components/containers/containers-table';
import { ContainerActions } from '../components/containers/container-actions';
import { ContainerFilters } from '../components/containers/container-filters';

export default function ContainersPage() {
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped'>('all');

  return (
    <div className="page-background min-h-screen">
      <div className="space-y-6 p-6 max-w-full">
        <div className="flex items-center justify-between">
          <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col items-start justify-start">
                <h1 className="text-3xl font-bold bg-clip-text">
                  Containers
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage your Docker containers
                </p>
              </div>
              <div className="flex items-start">
                <ContainerActions selectedContainers={selectedContainers} />
              </div>
            </div>
          </div>
        </div>

        <div className="content-section">
          <ContainerFilters filter={filter} onFilterChange={setFilter} />
        </div>

        <div className="content-section">
          <ContainersTable
            filter={filter}
            selectedContainers={selectedContainers}
            onSelectionChange={setSelectedContainers}
          />
        </div>
      </div>
    </div>
  );
} 