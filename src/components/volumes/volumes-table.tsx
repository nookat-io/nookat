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
import { Volume, VolumeScope, VolumeSizes } from './volume-types';
import { VolumeActionService } from './volume-actions-service';
import { ReactNode, useMemo, useState } from 'react';
import { formatBytes } from '../../utils/format';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ui/error-display';
import { SortableTableHeader } from '../ui/sortable-table-header';
import { useTableSort } from '../../hooks/use-table-sort';

const SCOPE_LABELS: Record<VolumeScope, string> = {
  [VolumeScope.Empty]: '-',
  [VolumeScope.Local]: 'Local',
  [VolumeScope.Global]: 'Global',
};

const formatScope = (scope?: VolumeScope) =>
  scope ? SCOPE_LABELS[scope] : '-';

const formatSize = (size?: number) =>
  size === undefined ? '-' : formatBytes(size);

const sizeOf = (sizes: VolumeSizes, name: string) =>
  Object.prototype.hasOwnProperty.call(sizes, name) ? sizes[name] : undefined;

interface VolumesTableProps {
  selectedVolumes: string[];
  onSelectionChange: (_selected: string[]) => void;
  volumes: Volume[];
  sizes: VolumeSizes;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyState: ReactNode;
}

export function VolumesTable({
  selectedVolumes,
  onSelectionChange,
  volumes,
  sizes,
  isLoading = false,
  error = null,
  onRetry,
  emptyState,
}: VolumesTableProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const volumesWithSize = useMemo(
    () =>
      volumes.map(volume => ({ ...volume, size: sizeOf(sizes, volume.name) })),
    [volumes, sizes]
  );

  const { sortedData: sortedVolumes, handleSort } = useTableSort(
    volumesWithSize,
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
      await VolumeActionService.removeVolume(volumeName);
    } finally {
      setIsDeleting(null);
    }
  };

  const totalVolumes = sortedVolumes.length;
  const selectedCount = selectedVolumes.length;
  const isAllSelected = totalVolumes > 0 && selectedCount === totalVolumes;

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
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
          <TableCell colSpan={7}>
            <div className="flex items-center justify-center">
              <ErrorDisplay error={error} onRetry={onRetry} showRetry={true} />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (sortedVolumes.length === 0) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7}>{emptyState}</TableCell>
        </TableRow>
      );
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
        <TableCell className="text-muted-foreground">
          {formatSize(volume.size)}
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
                  disabled={totalVolumes === 0}
                />
              </TableHead>
              <SortableTableHeader
                sortKey="name"
                onSort={handleSort}
                className="w-[35%]"
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
                sortKey="size"
                onSort={handleSort}
                className="w-[10%]"
              >
                Size
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="mountpoint"
                onSort={handleSort}
                className="w-[25%]"
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
