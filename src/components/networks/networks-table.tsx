import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { Network, isSystemNetwork } from './network-types';
import { removeNetwork } from './network-actions-service';
import { toast } from 'sonner';
import { useState } from 'react';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ui/error-display';
import { SortableTableHeader } from '../ui/sortable-table-header';
import { useTableSort } from '../../hooks/use-table-sort';
import { errorMessage } from '../../utils/error-message';

interface NetworksTableProps {
  selectedNetworks: string[];
  onSelectionChange: (_selected: string[]) => void;
  networks: Network[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function NetworksTable({
  selectedNetworks,
  onSelectionChange,
  networks,
  isLoading = false,
  error = null,
  onRetry,
}: NetworksTableProps) {
  const networksArray = networks || [];
  const [deletingNetworks, setDeletingNetworks] = useState<Set<string>>(
    new Set()
  );

  const { sortedData: sortedNetworks, handleSort } = useTableSort(
    networksArray.map(network => ({
      ...network,
      isSystem: isSystemNetwork(network),
    })),
    'name',
    'asc'
  );

  const handleSelectAll = (checked: boolean) => {
    const selectableNetworks = sortedNetworks.filter(n => !isSystemNetwork(n));
    if (checked) {
      onSelectionChange(selectableNetworks.map(n => n.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectNetwork = (networkId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedNetworks, networkId]);
    } else {
      onSelectionChange(selectedNetworks.filter(id => id !== networkId));
    }
  };

  const handleDeleteNetwork = async (networkName: string) => {
    setDeletingNetworks(prev => new Set(prev).add(networkName));
    try {
      await removeNetwork(networkName);
      toast.success(`Successfully deleted network "${networkName}"`);
    } catch (error) {
      console.error('Failed to delete network:', error);
      toast.error(errorMessage(error, 'Failed to delete network'));
    } finally {
      setDeletingNetworks(prev => {
        const newSet = new Set(prev);
        newSet.delete(networkName);
        return newSet;
      });
    }
  };

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={8}>
            <div className="flex items-center justify-center">
              <LoadingSpinner message="Loading networks..." size="lg" />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={8}>
            <div className="flex items-center justify-center">
              <ErrorDisplay error={error} onRetry={onRetry} showRetry={true} />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (sortedNetworks.length === 0) {
      return <></>;
    }

    return sortedNetworks.map(network => {
      const isSystem = isSystemNetwork(network);
      const createdDate = network.created
        ? (() => {
            try {
              const date = new Date(network.created);
              return isNaN(date.getTime()) ? null : date;
            } catch {
              return null;
            }
          })()
        : null;

      return (
        <TableRow key={network.id}>
          <TableCell>
            {!isSystem && (
              <Checkbox
                checked={selectedNetworks.includes(network.id)}
                onCheckedChange={checked =>
                  handleSelectNetwork(network.id, checked as boolean)
                }
              />
            )}
          </TableCell>
          <TableCell className="font-medium truncate" title={network.name}>
            {network.name}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {network.driver}
          </TableCell>
          <TableCell className="text-muted-foreground whitespace-nowrap">
            {createdDate ? `${formatDistanceToNow(createdDate)} ago` : '-'}
          </TableCell>
          <TableCell className="text-muted-foreground text-xs font-mono">
            {network.subnet || '-'}
          </TableCell>
          <TableCell className="text-muted-foreground text-xs font-mono">
            {network.gateway || '-'}
          </TableCell>
          <TableCell>
            <Badge variant={isSystem ? 'secondary' : 'default'}>
              {isSystem ? 'System' : 'Custom'}
            </Badge>
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={isSystem}>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={
                    network.containers > 0 || deletingNetworks.has(network.name)
                  }
                  onClick={() => handleDeleteNetwork(network.name)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deletingNetworks.has(network.name)
                    ? 'Deleting...'
                    : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      );
    });
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
                    selectedNetworks.length > 0 &&
                    selectedNetworks.length ===
                      sortedNetworks.filter(n => !isSystemNetwork(n)).length
                  }
                  onCheckedChange={value => handleSelectAll(value === true)}
                />
              </TableHead>
              <SortableTableHeader
                sortKey="name"
                onSort={handleSort}
                className="w-[25%]"
              >
                Name
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="driver"
                onSort={handleSort}
                className="w-[9%]"
              >
                Driver
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="created"
                onSort={handleSort}
                className="w-[16%]"
              >
                Created
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="subnet"
                onSort={handleSort}
                className="w-[16%]"
              >
                Subnet
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="gateway"
                onSort={handleSort}
                className="w-[14%]"
              >
                Gateway
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="isSystem"
                onSort={handleSort}
                className="w-[11%]"
              >
                Type
              </SortableTableHeader>
              <TableHead className="w-[9%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="flex-1">{renderTableBody()}</TableBody>
        </Table>
      </div>
    </div>
  );
}
