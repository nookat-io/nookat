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
import { Network } from './network-types';
import { removeNetwork } from './network-actions-utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ui/error-display';
import { SortableTableHeader } from '../ui/sortable-table-header';
import { useTableSort } from '../../hooks/use-table-sort';

interface NetworksTableProps {
  selectedNetworks: string[];
  onSelectionChange: (_selected: string[]) => void;
  networks: Network[];
  onActionComplete?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function NetworksTable({
  selectedNetworks,
  onSelectionChange,
  networks,
  onActionComplete,
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
      isSystem:
        network.name === 'bridge' ||
        network.name === 'host' ||
        network.name === 'none',
    })),
    'name',
    'asc'
  );

  const handleSelectAll = (checked: boolean) => {
    const selectableNetworks = sortedNetworks.filter(
      n => n.name !== 'bridge' && n.name !== 'host' && n.name !== 'none'
    );
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
      onActionComplete?.();
    } catch (error) {
      console.error('Failed to delete network:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete network';
      toast.error(errorMessage);
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
      const isSystemNetwork =
        network.name === 'bridge' ||
        network.name === 'host' ||
        network.name === 'none';
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
            {!isSystemNetwork && (
              <Checkbox
                checked={selectedNetworks.includes(network.id)}
                onCheckedChange={checked =>
                  handleSelectNetwork(network.id, checked as boolean)
                }
              />
            )}
          </TableCell>
          <TableCell className="font-medium">{network.name}</TableCell>
          <TableCell className="text-muted-foreground">
            {network.driver}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {createdDate ? `${formatDistanceToNow(createdDate)} ago` : '-'}
          </TableCell>
          <TableCell className="text-muted-foreground text-xs font-mono">
            {network.subnet || '-'}
          </TableCell>
          <TableCell className="text-muted-foreground text-xs font-mono">
            {network.gateway || '-'}
          </TableCell>
          <TableCell>
            <Badge variant={isSystemNetwork ? 'secondary' : 'default'}>
              {isSystemNetwork ? 'System' : 'Custom'}
            </Badge>
          </TableCell>
          <TableCell>
            {!isSystemNetwork && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    disabled={
                      network.containers > 0 ||
                      deletingNetworks.has(network.name)
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
            )}
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
                      sortedNetworks.filter(
                        n =>
                          n.name !== 'bridge' &&
                          n.name !== 'host' &&
                          n.name !== 'none'
                      ).length
                  }
                  onCheckedChange={value => handleSelectAll(value === true)}
                />
              </TableHead>
              <SortableTableHeader sortKey="name" onSort={handleSort}>
                Name
              </SortableTableHeader>
              <SortableTableHeader sortKey="driver" onSort={handleSort}>
                Driver
              </SortableTableHeader>
              <SortableTableHeader sortKey="created" onSort={handleSort}>
                Created
              </SortableTableHeader>
              <SortableTableHeader sortKey="subnet" onSort={handleSort}>
                Subnet
              </SortableTableHeader>
              <SortableTableHeader sortKey="gateway" onSort={handleSort}>
                Gateway
              </SortableTableHeader>
              <SortableTableHeader sortKey="isSystem" onSort={handleSort}>
                Type
              </SortableTableHeader>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="flex-1">{renderTableBody()}</TableBody>
        </Table>
      </div>
    </div>
  );
}
