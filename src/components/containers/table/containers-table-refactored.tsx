'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../ui/table';
import { Checkbox } from '../../ui/checkbox';
import { ContainerData } from '../data/container-data-provider';
import { ContainerLogsForm } from '../forms/container-logs-form';
import { ContainerRow } from './container-row';
import { ContainerGroupRow } from './container-group-row';
import { organizeContainers, formatContainerName } from '../utils/container-utils';

interface ContainersTableProps {
  filter: 'all' | 'running' | 'stopped';
  selectedContainers: string[];
  onSelectionChange: (_selected: string[]) => void;
  containers: ContainerData[];
  onActionComplete?: () => void;
}

export function ContainersTable({ 
  filter, 
  selectedContainers, 
  onSelectionChange,
  containers,
  onActionComplete
}: ContainersTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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

  const { individualContainers, groupedContainers } = organizeContainers(containers, expandedGroups);

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

  const handleOpenLogs = (container: ContainerData) => {
    setSelectedContainerForLogs(container);
    setLogsFormOpen(true);
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
              .map(container => (
                <ContainerRow
                  key={container.id}
                  container={container}
                  isSelected={selectedContainers.includes(container.id)}
                  onSelectionChange={handleSelectContainer}
                  onActionComplete={onActionComplete}
                  onOpenLogs={handleOpenLogs}
                />
              ))}
            
            {/* Grouped containers */}
            {groupedContainers.map(group => (
              <div key={`group-${group.projectName}`}>
                <ContainerGroupRow
                  projectName={group.projectName}
                  containers={group.containers}
                  isExpanded={expandedGroups.has(group.projectName)}
                  filter={filter}
                  onToggleGroup={toggleGroup}
                  onActionComplete={onActionComplete}
                />
                {expandedGroups.has(group.projectName) && 
                  group.containers
                    .filter(container => {
                      if (filter === 'running') return container.state === 'running';
                      if (filter === 'stopped') return container.state !== 'running';
                      return true;
                    })
                    .map(container => (
                      <ContainerRow
                        key={container.id}
                        container={container}
                        isNested={true}
                        isSelected={selectedContainers.includes(container.id)}
                        onSelectionChange={handleSelectContainer}
                        onActionComplete={onActionComplete}
                        onOpenLogs={handleOpenLogs}
                      />
                    ))
                }
              </div>
            ))}
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