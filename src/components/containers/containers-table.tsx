'use client';

import { useState } from 'react';
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

interface ContainersTableProps {
  filter: 'all' | 'running' | 'stopped';
  selectedContainers: string[];
  onSelectionChange: (_selected: string[]) => void;
  containers: ContainerData[];
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
  containers
}: ContainersTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
    if (filter === 'stopped') return ['stopped', 'exited', 'created', 'paused', 'dead'].includes(container.state);
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
      <TableCell className="text-muted-foreground">
        {container.size}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Start action - available for stopped, exited, created, paused containers */}
            {['stopped', 'exited', 'created', 'paused'].includes(container.state) && (
              <DropdownMenuItem>
                <Play className="mr-2 h-4 w-4" />
                Start
              </DropdownMenuItem>
            )}
            
            {/* Stop action - available for running, restarting containers */}
            {['running', 'restarting'].includes(container.state) && (
              <DropdownMenuItem>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </DropdownMenuItem>
            )}
            
            {/* Pause action - available for running containers */}
            {container.state === 'running' && (
              <DropdownMenuItem>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </DropdownMenuItem>
            )}
            
            {/* Resume action - available for paused containers */}
            {container.state === 'paused' && (
              <DropdownMenuItem>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </DropdownMenuItem>
            )}
            
            {/* Restart action - available for running, restarting containers */}
            {['running', 'restarting'].includes(container.state) && (
              <DropdownMenuItem>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restart
              </DropdownMenuItem>
            )}
            
            {/* Terminal and Logs - available for running containers */}
            {container.state === 'running' && (
              <>
                <DropdownMenuItem>
                  <Terminal className="mr-2 h-4 w-4" />
                  Terminal
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Logs
                </DropdownMenuItem>
              </>
            )}
            
            {/* Delete action - available for stopped, exited, created, paused containers */}
            {['stopped', 'exited', 'created', 'paused'].includes(container.state) && (
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
      if (filter === 'stopped') return ['stopped', 'exited', 'created', 'paused', 'dead'].includes(container.state);
      return true;
    });

    if (filteredGroupContainers.length === 0) return null;

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
              {group.containers.some(c => ['stopped', 'exited', 'created', 'paused', 'dead'].includes(c.state)) && (
                <Badge variant="secondary" className="text-xs">
                  Stopped
                </Badge>
              )}
              {group.containers.some(c => c.state === 'restarting') && (
                <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  Restarting
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">-</TableCell>
          <TableCell className="text-muted-foreground">-</TableCell>
          <TableCell className="text-muted-foreground">-</TableCell>
          <TableCell>
            <div className="flex gap-1">
              {group.containers.some(container => ['stopped', 'exited', 'created', 'paused'].includes(container.state)) && (
                <Button size="sm" variant="outline" className="h-6 px-2">
                  <Play className="h-3 w-3 mr-1" />
                  Start All
                </Button>
              )}
              {group.containers.some(container => ['running', 'restarting'].includes(container.state)) && (
                <Button size="sm" variant="outline" className="h-6 px-2">
                  <Square className="h-3 w-3 mr-1" />
                  Stop All
                </Button>
              )}
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
              <TableHead>Size</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Individual containers */}
            {individualContainers
              .filter(container => {
                if (filter === 'running') return container.state === 'running';
                if (filter === 'stopped') return container.state === 'stopped';
                return true;
              })
              .map(container => renderContainerRow(container))}
            
            {/* Grouped containers */}
            {groupedContainers.map(group => renderGroupRow(group))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}