import { useState, useEffect, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { Search } from "lucide-react";
import { ContainersTable } from '../components/containers/containers-table';
import { ContainerActions } from '../components/containers/container-actions';
import { ContainerFilters } from '../components/containers/container-filters';

const AUTO_REFRESH_INTERVAL = 500;

export interface ContainerData {
  id: string;
  names: string[];
  image: string;
  state: 'running' | 'stopped' | 'paused' | 'restarting';
  created: number;
  ports: object[];
  size: string;
  labels: Record<string, string>;
}

export default function ContainersPage() {
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const [containers, setContainers] = useState<ContainerData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const lastRefreshTime = useRef<number>(Date.now());
  const autoRefreshInterval = useRef<number | null>(null);

  async function getContainers() {
    try {
      const result = await invoke<ContainerData[]>("list_containers");
      setContainers(result);
      lastRefreshTime.current = Date.now();
      console.log(result);
    } catch (error) {
      console.error("Error getting containers:", error);
    }
  }

  useEffect(() => {
    const startAutoRefresh = () => {
      autoRefreshInterval.current = setInterval(() => {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.current;
        if (timeSinceLastRefresh > AUTO_REFRESH_INTERVAL) {
          getContainers();
        }
      }, AUTO_REFRESH_INTERVAL);
    };

    // Initial load
    getContainers();
    
    // Start auto-refresh
    startAutoRefresh();

    // Cleanup on unmount
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  const filteredContainers = containers.filter(container => {
    const containerName = container.names.length > 0 ? container.names[0].replace(/^\//, '') : '';
    const imageName = container.image && container.image.includes("@") 
      ? container.image.split("@")[0] 
      : container.image;
    
    const matchesSearch = containerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         imageName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'running') return matchesSearch && container.state === 'running';
    if (filter === 'stopped') return matchesSearch && container.state === 'stopped';
    return matchesSearch;
  });

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
          <div className="flex items-center justify-between">
            <ContainerFilters filter={filter} onFilterChange={setFilter} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search containers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="content-section">
          <ContainersTable
            filter={filter}
            selectedContainers={selectedContainers}
            onSelectionChange={setSelectedContainers}
            containers={filteredContainers}
          />
        </div>
      </div>
    </div>
  );
} 