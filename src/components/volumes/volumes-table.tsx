'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Volume } from './volume-types';
import { VolumeActionService } from './volume-actions-service';
import { useState } from 'react';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ui/error-display';
import { SortableTableHeader } from '../ui/sortable-table-header';
import { useTableSort } from '../../hooks/use-table-sort';

interface VolumesTableProps {
  selectedVolumes: string[];
  onSelectionChange: (_selected: string[]) => void;
  volumes: Volume[];
  onActionComplete?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function VolumesTable({
  selectedVolumes,
  onSelectionChange,
  volumes,
  onActionComplete,
  isLoading = false,
  error = null,
  onRetry,
}: VolumesTableProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const { sortedData: sortedVolumes, handleSort } = useTableSort(
    volumes,
    'name',
    'asc'
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(sortedVolumes.map(v => v.name));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectVolume = (volumeName: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedVolumes, volumeName]);
    } else {
      onSelectionChange(selectedVolumes.filter(name => name !== volumeName));
    }
  };

  const handleDeleteVolume = async (volumeName: string) => {
    setIsDeleting(volumeName);
    try {
      await VolumeActionService.removeVolume(volumeName, {
        onActionComplete,
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatScope = (scope?: string) => {
    if (!scope || scope === 'EMPTY') return '-';
    return scope === 'LOCAL' ? 'Local' : 'Global';
  };

  const totalVolumes = sortedVolumes.length;
  const selectedCount = selectedVolumes.length;
  const isAllSelected = totalVolumes > 0 && selectedCount === totalVolumes;

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="flex items-center justify-center">
              <LoadingSpinner message="Loading volumes..." size="lg" />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="flex items-center justify-center">
              <ErrorDisplay error={error} onRetry={onRetry} showRetry={true} />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (sortedVolumes.length === 0) {
      return <></>;
    }

    return sortedVolumes.map(volume => (
      <TableRow key={volume.name}>
        <TableCell>
          <Checkbox
            checked={selectedVolumes.includes(volume.name)}
            onCheckedChange={value =>
              handleSelectVolume(volume.name, value === true)
            }
          />
        </TableCell>
        <TableCell className="font-medium truncate" title={volume.name}>
          {volume.name}
        </TableCell>
        <TableCell
          className="text-muted-foreground truncate"
          title={volume.driver}
        >
          {volume.driver}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatScope(volume.scope)}
        </TableCell>
        <TableCell
          className="text-muted-foreground text-xs font-mono truncate"
          title={volume.mountpoint}
        >
          {volume.mountpoint}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteVolume(volume.name)}
                disabled={isDeleting === volume.name}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting === volume.name ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="overflow-x-auto flex-1">
        <Table className="table-fixed h-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <SortableTableHeader
                sortKey="name"
                onSort={handleSort}
                className="w-[40%]"
              >
                Name
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="driver"
                onSort={handleSort}
                className="w-[10%]"
              >
                Driver
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="scope"
                onSort={handleSort}
                className="w-[10%]"
              >
                Scope
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="mountpoint"
                onSort={handleSort}
                className="w-[30%]"
              >
                Mount Point
              </SortableTableHeader>
              <TableHead className="w-[10%] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="flex-1">{renderTableBody()}</TableBody>
        </Table>
      </div>
    </div>
  );
}
