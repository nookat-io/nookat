'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Terminal, 
  MoreHorizontal,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Pause
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ContainerData } from './container-data-provider';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { ContainerLogsForm } from './container-logs-form';

interface ContainersTableProps {
  filter: 'all' | 'running' | 'stopped';
  selectedContainers: string[];
  onSelectionChange: (_selected: string[]) => void;
  containers: ContainerData[];
  onActionComplete?: () => void;
}

interface ContainerGroup {
  projectName: string;
  containers: ContainerData[];
  isExpanded: boolean;
}

export function ContainersTable({ 
  filter, 
  selectedContainers, 
  onSelectionChange,
  containers,
  onActionComplete
}: ContainersTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [openingTerminal, setOpeningTerminal] = useState<string | null>(null);
  const [logsFormOpen, setLogsFormOpen] = useState(false);
  const [selectedContainerForLogs, setSelectedContainerForLogs] = useState<ContainerData | null>(null);

  // Clean up stale selections when containers list changes
  useEffect(() => {
    const existingContainerIds = new Set(containers.map(c => c.id));
    const staleSelections = selectedContainers.filter(id => !existingContainerIds.has(id));
    
    if (staleSelections.length > 0) {
      const cleanedSelections = selectedContainers.filter(id => existingContainerIds.has(id));
      onSelectionChange(cleanedSelections);
    }
  }, [containers, selectedContainers, onSelectionChange]);

  const getProjectName = (container: ContainerData): string | null => {
    return container.labels && container.labels["com.docker.compose.project"] || null;
  };

  const organizeContainers = () => {
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
      isExpanded: expandedGroups.has(projectName)
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
  };

  const { individualContainers, groupedContainers } = organizeContainers();

  const allContainers = [
    ...individualContainers,
    ...groupedContainers.flatMap(group => group.containers)
  ];

  const filteredContainers = allContainers.filter(container => {
    if (filter === 'running') return container.state === 'running';
    if (filter === 'stopped') return container.state !== 'running';
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredContainers.map(c => c.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectContainer = (containerId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedContainers, containerId]);
    } else {
      onSelectionChange(selectedContainers.filter(id => id !== containerId));
    }
  };

  const toggleGroup = (projectName: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(projectName)) {
      newExpandedGroups.delete(projectName);
    } else {
      newExpandedGroups.add(projectName);
    }
    setExpandedGroups(newExpandedGroups);
  };

  const handleContainerAction = async (action: string, containerId: string) => {
    try {
      await invoke(action, { id: containerId });
      
      const actionName = action.replace('_container', '').replace('unpause', 'resume');
      toast.success(`${actionName.charAt(0).toUpperCase() + actionName.slice(1)}ed container`);
      
      // Add a small delay to ensure the backend operation completes before refreshing
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error(`Error ${action}ing container:`, error);
      const actionName = action.replace('_container', '').replace('unpause', 'resume');
      toast.error(`Failed to ${actionName} container: ${error}`);
      
      // Refresh even on error to ensure UI is in sync
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    }
  };

  const handleBulkAction = async (action: string, containerIds: string[]) => {
    try {
      await invoke(action, { ids: containerIds });
      
      const actionName = action.replace('bulk_', '').replace('_containers', '').replace('unpause', 'resume');
      toast.success(`${actionName.charAt(0).toUpperCase() + actionName.slice(1)}ed ${containerIds.length} containers`);
      
      // Add a small delay to ensure the backend operation completes before refreshing
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error(`Error ${action}ing containers:`, error);
      const actionName = action.replace('bulk_', '').replace('_containers', '').replace('unpause', 'resume');
      toast.error(`Failed to ${actionName} containers: ${error}`);
      
      // Refresh even on error to ensure UI is in sync
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    }
  };

  const handleDeleteContainer = async (containerId: string) => {
    try {
      // Find the container to check its state
      const container = containers.find(c => c.id === containerId);
      if (!container) {
        toast.error('Container not found');
        return;
      }

      // Use force removal for running containers, regular removal for others
      const action = container.state === 'running' ? 'force_remove_container' : 'remove_container';
      await invoke(action, { id: containerId });
      
      const actionText = container.state === 'running' ? 'Force deleted' : 'Deleted';
      toast.success(`${actionText} container`);
      
      // Add a small delay to ensure the backend operation completes before refreshing
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error('Error deleting container:', error);
      toast.error(`Failed to delete container: ${error}`);
      
      // Refresh even on error to ensure UI is in sync
      setTimeout(() => {
        onActionComplete?.();
      }, 500);
    }
  };

  const handleOpenTerminal = async (containerId: string) => {
    try {
      setOpeningTerminal(containerId);
      await invoke('open_terminal', { id: containerId });
      toast.success('Terminal opened');
    } catch (error) {
      console.error('Error opening terminal:', error);
      toast.error(`Failed to open terminal: ${error}`);
    } finally {
      setOpeningTerminal(null);
    }
  };

  const formatContainerName = (container: ContainerData) => {
    if (container.names.length > 0) {
      let first_name = container.names[0];
      if (first_name.startsWith("/")) {
        first_name = first_name.slice(1);
      }
      return first_name;
    }
    return "";
  };

  const formatContainerImage = (image: string) => {
    if (image && image.includes("@")) {
      return image.split("@")[0];
    }
    return image;
  };

  const formatContainerPorts = (ports: object[]) => {
    if (ports && ports.length > 0) {
      return `${ports.length} port(s) mapped`;
    }
    return "No port mapping";
  };

  const renderContainerRow = (container: ContainerData, isNested: boolean = false) => (
    <TableRow key={container.id} className={isNested ? "bg-muted/50" : ""}>
      <TableCell className={isNested ? "pl-8" : ""}>
        <Checkbox 
          checked={selectedContainers.includes(container.id)}
          onCheckedChange={(checked) => 
            handleSelectContainer(container.id, checked as boolean)
          }
        />
      </TableCell>
      <TableCell className={`font-medium ${isNested ? "pl-8" : ""}`}>
        {formatContainerName(container)}
      </TableCell>
      <TableCell className="text-muted-foreground">{formatContainerImage(container.image)}</TableCell>
      <TableCell>
        <Badge 
          variant="secondary"
          className={
            container.state === 'running' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
              : container.state === 'paused'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
              : container.state === 'restarting'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
              : container.state === 'exited' || container.state === 'dead'
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              : container.state === 'removing'
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
              : ''
          }
        >
          {container.state}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(new Date(container.created * 1000))} ago
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatContainerPorts(container.ports)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Start action - available for stopped, exited, created containers */}
            {['stopped', 'exited', 'created'].includes(container.state) && (
              <DropdownMenuItem onClick={() => handleContainerAction('start_container', container.id)}>
                <Play className="mr-2 h-4 w-4" />
                Start
              </DropdownMenuItem>
            )}
            
            {/* Stop action - available for running, restarting containers */}
            {['running', 'restarting'].includes(container.state) && (
              <DropdownMenuItem onClick={() => handleContainerAction('stop_container', container.id)}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </DropdownMenuItem>
            )}
            
            {/* Pause action - available for running containers */}
            {container.state === 'running' && (
              <DropdownMenuItem onClick={() => handleContainerAction('pause_container', container.id)}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </DropdownMenuItem>
            )}
            
            {/* Resume action - available for paused containers */}
            {container.state === 'paused' && (
              <DropdownMenuItem onClick={() => handleContainerAction('unpause_container', container.id)}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </DropdownMenuItem>
            )}
            
            {/* Restart action - available for running, restarting containers */}
            {['running', 'restarting'].includes(container.state) && (
              <DropdownMenuItem onClick={() => handleContainerAction('restart_container', container.id)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restart
              </DropdownMenuItem>
            )}
            
            {/* Terminal - available for running containers */}
            {container.state === 'running' && (
              <DropdownMenuItem 
                onClick={() => handleOpenTerminal(container.id)}
                disabled={openingTerminal === container.id}
              >
                <Terminal className="mr-2 h-4 w-4" />
                {openingTerminal === container.id ? 'Opening...' : 'Terminal'}
              </DropdownMenuItem>
            )}
            
            {/* Logs - available for all containers */}
            <DropdownMenuItem onClick={() => {
              setSelectedContainerForLogs(container);
              setLogsFormOpen(true);
            }}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Logs
            </DropdownMenuItem>
            
            {/* Delete action - available for stopped, exited, created containers */}
            {['stopped', 'exited', 'created', "running"].includes(container.state) && (
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => handleDeleteContainer(container.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {container.state === 'running' ? 'Force Delete' : 'Delete'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  const renderGroupRow = (group: ContainerGroup) => {
    const isExpanded = expandedGroups.has(group.projectName);
    const filteredGroupContainers = group.containers.filter(container => {
      if (filter === 'running') return container.state === 'running';
      if (filter === 'stopped') return container.state !== 'running';
      return true;
    });

    if (filteredGroupContainers.length === 0) return null;

    const hasRunningContainers = group.containers.some(c => c.state === 'running');
    const allStopped = group.containers.every(c => c.state !== 'running');
    const groupContainerIds = group.containers.map(c => c.id);

    return (
      <>
        <TableRow key={`group-${group.projectName}`} className="bg-muted/30">
          <TableCell>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleGroup(group.projectName)}
              className="p-0 h-auto"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </TableCell>
          <TableCell className="font-semibold">
            <div className="flex items-center gap-2">
              <span>{group.projectName}</span>
              <Badge variant="outline" className="text-xs">
                {filteredGroupContainers.length} containers
              </Badge>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">Docker Compose Project</TableCell>
          <TableCell>
            <div className="flex gap-1">
              {group.containers.some(c => c.state === 'running') && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Running
                </Badge>
              )}
              {group.containers.every(c => c.state !== 'running') && (
                <Badge variant="secondary" className="text-xs">
                  Stopped
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">-</TableCell>
          <TableCell className="text-muted-foreground">-</TableCell>
          <TableCell>
            <div className="flex gap-1">
              {/* Start action for stopped groups */}
              {allStopped && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('bulk_start_containers', groupContainerIds)}
                  className="h-7 px-2 text-xs"
                >
                  <Play className="mr-1 h-3 w-3" />
                  Start
                </Button>
              )}
              
              {/* Stop action for groups with running containers */}
              {hasRunningContainers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('bulk_stop_containers', groupContainerIds)}
                  className="h-7 px-2 text-xs"
                >
                  <Square className="mr-1 h-3 w-3" />
                  Stop
                </Button>
              )}
              
              {/* Delete action for all groups */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const action = hasRunningContainers ? 'bulk_force_remove_containers' : 'bulk_remove_containers';
                  handleBulkAction(action, groupContainerIds);
                }}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && filteredGroupContainers.map(container => renderContainerRow(container, true))}
      </>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedContainers.length === filteredContainers.length && filteredContainers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Ports</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Individual containers */}
            {individualContainers
              .filter(container => {
                if (filter === 'running') return container.state === 'running';
                if (filter === 'stopped') return container.state !== 'running';
                return true;
              })
              .map(container => renderContainerRow(container))}
            
            {/* Grouped containers */}
            {groupedContainers.map(group => renderGroupRow(group))}
          </TableBody>
        </Table>
      </div>
      
      {/* Logs Form Modal */}
      {selectedContainerForLogs && (
        <ContainerLogsForm
          containerId={selectedContainerForLogs.id}
          containerName={formatContainerName(selectedContainerForLogs)}
          containerState={selectedContainerForLogs.state}
          isOpen={logsFormOpen}
          onClose={() => {
            setLogsFormOpen(false);
            setSelectedContainerForLogs(null);
          }}
        />
      )}
    </div>
  );
}