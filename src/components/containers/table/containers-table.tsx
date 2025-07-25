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
import { organizeContainers } from '../utils/container-utils';

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
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedContainers.length === filteredContainers.length && filteredContainers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[25%]">Name</TableHead>
              <TableHead className="w-[25%]">Image</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[15%]">Created</TableHead>
              <TableHead className="w-[15%]">Ports</TableHead>
              <TableHead className="w-[10%] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Render individual containers */}
            {individualContainers.map(container => (
              <ContainerRow
                key={container.id}
                container={container}
                isSelected={selectedContainers.includes(container.id)}
                onSelectionChange={handleSelectContainer}
                onActionComplete={onActionComplete}
                onOpenLogs={handleOpenLogs}
              />
            ))}
            
                         {/* Render grouped containers */}
             {groupedContainers.map(group => (
               <ContainerGroupRow
                 key={group.projectName}
                 projectName={group.projectName}
                 containers={group.containers}
                 isExpanded={group.isExpanded}
                 filter={filter}
                 selectedContainers={selectedContainers}
                 onToggleGroup={toggleGroup}
                 onSelectionChange={handleSelectContainer}
                 onActionComplete={onActionComplete}
                 onOpenLogs={handleOpenLogs}
               />
             ))}
          </TableBody>
        </Table>
      </div>

      {/* Logs Form Modal */}
      {logsFormOpen && selectedContainerForLogs && (
        <ContainerLogsForm
          containerId={selectedContainerForLogs.id}
          containerName={selectedContainerForLogs.names[0]?.replace(/^\//, '') || selectedContainerForLogs.id}
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