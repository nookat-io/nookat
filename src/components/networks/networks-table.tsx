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
import { NetworkData } from './network-data-provider';
import { removeNetwork } from './network-actions-utils';
import { toast } from 'sonner';
import { useState } from 'react';

interface NetworksTableProps {
  selectedNetworks: string[];
  onSelectionChange: (_selected: string[]) => void;
  networks: NetworkData[];
  onActionComplete?: () => void;
}

export function NetworksTable({
  selectedNetworks,
  onSelectionChange,
  networks,
  onActionComplete,
}: NetworksTableProps) {
  const networksArray = networks || [];
  const [deletingNetworks, setDeletingNetworks] = useState<Set<string>>(
    new Set()
  );

  const handleSelectAll = (checked: boolean) => {
    const selectableNetworks = networksArray.filter(
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

  // Sort networks: System networks first, then by driver, then by name
  const sortedNetworks = [...networksArray].sort((a, b) => {
    const aIsSystem =
      a.name === 'bridge' || a.name === 'host' || a.name === 'none';
    const bIsSystem =
      b.name === 'bridge' || b.name === 'host' || b.name === 'none';

    // First sort by type (System before Custom)
    if (aIsSystem && !bIsSystem) return -1;
    if (!aIsSystem && bIsSystem) return 1;

    // Then sort by driver
    if (a.driver !== b.driver) {
      return a.driver.localeCompare(b.driver);
    }

    // Finally sort by name
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedNetworks.length > 0 &&
                    selectedNetworks.length ===
                      networksArray.filter(
                        n =>
                          n.name !== 'bridge' &&
                          n.name !== 'host' &&
                          n.name !== 'none'
                      ).length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Subnet</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedNetworks.map(network => {
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
                    {createdDate
                      ? `${formatDistanceToNow(createdDate)} ago`
                      : '-'}
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
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
