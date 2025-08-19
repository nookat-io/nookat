import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Container } from './container-types';
import { ContainerLogsForm } from './container-logs-form';
import { ContainerRow } from './container-row';
import { ContainerGroupRow } from './container-group-row';
import { organizeContainers } from './container-utils';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ui/error-display';

interface ContainersTableProps {
  selectedContainers: string[];
  onSelectionChange: (_selected: string[]) => void;
  containers: Container[];
  onActionComplete?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ContainersTable({
  selectedContainers,
  onSelectionChange,
  containers,
  onActionComplete,
  isLoading = false,
  error = null,
  onRetry,
}: ContainersTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedContainerForLogs, setSelectedContainerForLogs] =
    useState<Container | null>(null);
  const [logsFormOpen, setLogsFormOpen] = useState(false);

  useEffect(() => {
    const existingContainerIds = new Set(containers.map(c => c.id));
    const staleSelections = selectedContainers.filter(
      id => !existingContainerIds.has(id)
    );

    if (staleSelections.length > 0) {
      const cleanedSelections = selectedContainers.filter(id =>
        existingContainerIds.has(id)
      );
      onSelectionChange(cleanedSelections);
    }
  }, [containers, selectedContainers, onSelectionChange]);

  const { individualContainers, groupedContainers } = organizeContainers(
    containers,
    expandedGroups
  );

  const allContainers = [
    ...individualContainers,
    ...groupedContainers.flatMap(group => group.containers),
  ];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(allContainers.map(c => c.id));
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

  const handleOpenLogs = (container: Container) => {
    setSelectedContainerForLogs(container);
    setLogsFormOpen(true);
  };

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <div className="flex items-center justify-center">
              <LoadingSpinner message="Loading containers..." size="lg" />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <div className="flex items-center justify-center">
              <ErrorDisplay error={error} onRetry={onRetry} showRetry={true} />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <>
        {groupedContainers.map(group => (
          <ContainerGroupRow
            key={group.projectName}
            projectName={group.projectName}
            containers={group.containers}
            isExpanded={group.isExpanded}
            selectedContainers={selectedContainers}
            onToggleGroup={toggleGroup}
            onSelectionChange={handleSelectContainer}
            onActionComplete={onActionComplete}
            onOpenLogs={handleOpenLogs}
          />
        ))}

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
      </>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="overflow-x-auto flex-1">
        <Table className="table-fixed h-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedContainers.length === allContainers.length &&
                    allContainers.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[25%]">Name</TableHead>
              <TableHead className="w-[25%]">Image</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[15%]">Created</TableHead>
              <TableHead className="w-[10%]">Ports</TableHead>
              <TableHead className="w-[10%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="flex-1">{renderTableBody()}</TableBody>
        </Table>
      </div>

      {logsFormOpen && selectedContainerForLogs && (
        <ContainerLogsForm
          containerId={selectedContainerForLogs.id}
          containerName={
            selectedContainerForLogs.names?.[0]?.replace(/^\//, '') ||
            selectedContainerForLogs.id ||
            'Unknown Container'
          }
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
