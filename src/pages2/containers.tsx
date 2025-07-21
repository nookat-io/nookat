import { Container, Play, Search, Square, ChevronDown, ChevronRight } from "lucide-react";
import { StatusBadge } from "../components2/StatusBadge";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useRef } from "react";
import { ContainerActions } from "../components2/ContainerActions";

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

interface ContainerGroup {
  projectName: string;
  containers: ContainerData[];
  isExpanded: boolean;
}

interface ContainerDisplayData {
  individualContainers: ContainerData[];
  groupedContainers: ContainerGroup[];
}

function formatContainerName(container: ContainerData) {
  if (container.names.length > 0) {
    let first_name = container.names[0];
    if (first_name.startsWith("/")) {
      first_name = first_name.slice(1);
    }
    return first_name;
  }
  return "";
}

function formatContainerImage(image: string) {
  if (image && image.includes("@")) {
    return image.split("@")[0];
  }
  return image;
}

function formatContainerPortMapping(ports: object[]) {
  if (ports && ports.length > 0) {
    // TODO: Implement proper port mapping display
    // const mappings = ports.map(port => {
    //   if (port.public_port && port.private_port !== port.public_port) {
    //     return `${port.private_port}:${port.public_port}`;
    //   }
    //   return port.private_port;
    // });
    // const uniqueMappings = Array.from(new Set(mappings));
    // return uniqueMappings.join(", ");
    return `${ports.length} port(s) mapped`;
  }
  return "No port mapping";
}

function formatContainerCreatedDaysAgo(created: number) {
  const date = new Date(created * 1000);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} days ago`;
}

function formatContainerCreated(created: number) {
  const date = new Date(created * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getProjectName(container: ContainerData): string | null {
  console.log(container);
  console.log(container.labels);
  return container.labels && container.labels["com.docker.compose.project"] || null;
}

function organizeContainers(containers: ContainerData[]): ContainerDisplayData {
  const individualContainers: ContainerData[] = [];
  const groupedContainers: Record<string, ContainerData[]> = {};

  containers.forEach(container => {
    const projectName = getProjectName(container);

    if (projectName) {
      // Container belongs to a compose project
      if (!groupedContainers[projectName]) {
        groupedContainers[projectName] = [];
      }
      groupedContainers[projectName].push(container);
    } else {
      // Individual container (not part of a compose project)
      individualContainers.push(container);
    }
  });

  // Sort containers by creation time (newest first)
  const sortByCreatedTime = (a: ContainerData, b: ContainerData) => b.created - a.created;

  const groups: ContainerGroup[] = Object.entries(groupedContainers).map(([projectName, containers]) => ({
    projectName,
    containers: containers.sort(sortByCreatedTime),
    isExpanded: true
  }));

  // Sort groups by the creation time of their newest container
  const sortedGroups = groups.sort((a, b) => {
    const newestA = Math.max(...a.containers.map(c => c.created));
    const newestB = Math.max(...b.containers.map(c => c.created));
    return newestB - newestA;
  });

  return {
    individualContainers: individualContainers.sort(sortByCreatedTime),
    groupedContainers: sortedGroups
  };
}

// Containers tab component
export const ContainersTab: React.FC = () => {
  const [containerData, setContainerData] = useState<ContainerDisplayData>({
    individualContainers: [],
    groupedContainers: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const lastRefreshTime = useRef<number>(Date.now());
  const autoRefreshInterval = useRef<number | null>(null);

  async function getContainers() {
    try {
      const result = await invoke<ContainerData[]>("list_containers");
      const organized = organizeContainers(result);
      setContainerData(organized);
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

  const toggleGroup = (projectName: string) => {
    setContainerData(prev => ({
      ...prev,
      groupedContainers: prev.groupedContainers.map(group =>
        group.projectName === projectName
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      )
    }));
  };

  const filterContainers = (containers: ContainerData[]) => {
    return containers.filter(container =>
      formatContainerName(container).toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatContainerImage(container.image).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredIndividualContainers = filterContainers(containerData.individualContainers);
  const filteredGroupedContainers = containerData.groupedContainers.map(group => ({
    ...group,
    containers: filterContainers(group.containers)
  })).filter(group => group.containers.length > 0);

  const renderContainer = (container: ContainerData, onUpdate: () => void) => (
    <div key={container.id} className="p-4 border-b border-gray-700 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 truncate">
          <Container size={20} className={`text-${container.state === 'running' ? 'green' : 'red'}-400`} />
          <div className="truncate max-w-lg">
            <h3 className="font-semibold text-white truncate max-w-xxxl select-text">{formatContainerName(container)}</h3>
            <p className="text-sm text-gray-400 truncate max-w-xxxl select-text">{formatContainerImage(container.image)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={container.state ?? 'unknown'} />
          <div className="text-sm text-gray-400 text-right truncate max-w-xs">
            <p className="truncate max-w-xs">Created:
              <span className="hidden lg:inline relative group cursor-pointer">
                {formatContainerCreatedDaysAgo(container.created)}
                <span className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 whitespace-nowrap bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg">
                  {formatContainerCreated(container.created)}
                </span>
              </span>
            </p>
            {
              (container.ports && container.ports.length > 0) &&
              <p className="hidden lg:block">Ports: {formatContainerPortMapping(container.ports)}</p>
            }
          </div>
          <ContainerActions container={container} onStateChanged={onUpdate} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Containers</h2>
        <div className="flex items-center gap-4">
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

      <div className="space-y-4">
        {/* Individual Containers */}
        {filteredIndividualContainers.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div>
              {filteredIndividualContainers.map(container => renderContainer(container, getContainers))}
            </div>
          </div>
        )}

        {/* Grouped Containers */}
        {filteredGroupedContainers.map(group => (
          <div key={group.projectName} className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => toggleGroup(group.projectName)}
                className="flex items-center gap-3 text-left hover:text-gray-300 transition-colors"
              >
                {group.isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <h3 className="font-semibold text-white">{group.projectName}</h3>
                <span className="text-sm text-gray-400">({group.containers.length} containers)</span>
              </button>

              <div className="flex items-center gap-2">
                {group.containers.every(container => container.state !== 'running') && (
                  <button
                    className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-1"
                    onClick={() => {
                      // TODO: Implement start all containers in group
                      console.log(`Start all containers in group: ${group.projectName}`);
                    }}
                  >
                    <Play size={12} />
                    Start
                  </button>
                )}
                {group.containers.some(container => container.state === 'running') && (
                  <button
                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center gap-1"
                    onClick={() => {
                      // TODO: Implement stop all containers in group
                      console.log(`Stop all containers in group: ${group.projectName}`);
                    }}
                  >
                    <Square size={12} />
                    Stop
                  </button>
                )}
              </div>
            </div>

            {group.isExpanded && (
              <div className="border-t border-gray-700">
                {group.containers.map(container => renderContainer(container, getContainers))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

