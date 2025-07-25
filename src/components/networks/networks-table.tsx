'use client';

import { useState } from 'react';
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
import { Trash2, Network, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  created: Date;
  subnet: string;
  gateway: string;
  containers: number;
  internal: boolean;
}

interface NetworksTableProps {
  selectedNetworks: string[];
  onSelectionChange: (_selected: string[]) => void;
}

export function NetworksTable({
  selectedNetworks,
  onSelectionChange,
}: NetworksTableProps) {
  const [networks] = useState<DockerNetwork[]>([
    {
      id: 'net_1',
      name: 'bridge',
      driver: 'bridge',
      scope: 'local',
      created: new Date(Date.now() - 2592000000), // 30 days ago
      subnet: '172.17.0.0/16',
      gateway: '172.17.0.1',
      containers: 3,
      internal: false,
    },
    {
      id: 'net_2',
      name: 'host',
      driver: 'host',
      scope: 'local',
      created: new Date(Date.now() - 2592000000),
      subnet: '',
      gateway: '',
      containers: 0,
      internal: false,
    },
    {
      id: 'net_3',
      name: 'app-network',
      driver: 'bridge',
      scope: 'local',
      created: new Date(Date.now() - 86400000),
      subnet: '172.18.0.0/16',
      gateway: '172.18.0.1',
      containers: 2,
      internal: false,
    },
  ]);

  const handleSelectAll = (checked: boolean) => {
    const selectableNetworks = networks.filter(
      n => n.name !== 'bridge' && n.name !== 'host'
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedNetworks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Subnet</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Containers</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {networks.map(network => {
              const isSystemNetwork =
                network.name === 'bridge' || network.name === 'host';
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
                    {network.scope}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(network.created)} ago
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {network.subnet || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {network.gateway || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {network.containers}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isSystemNetwork ? 'secondary' : 'default'}>
                      {isSystemNetwork ? 'System' : 'Custom'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Network className="mr-2 h-4 w-4" />
                          Inspect
                        </DropdownMenuItem>
                        {!isSystemNetwork && (
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled={network.containers > 0}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
