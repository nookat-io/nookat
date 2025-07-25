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
import { Trash2, HardDrive, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface Volume {
  id: string;
  name: string;
  driver: string;
  mountpoint: string;
  created: Date;
  size: string;
  inUse: boolean;
  containers: string[];
}

interface VolumesTableProps {
  selectedVolumes: string[];
  onSelectionChange: (_selected: string[]) => void;
}

export function VolumesTable({
  selectedVolumes,
  onSelectionChange,
}: VolumesTableProps) {
  const [volumes] = useState<Volume[]>([
    {
      id: 'vol_1',
      name: 'postgres_data',
      driver: 'local',
      mountpoint: '/var/lib/docker/volumes/postgres_data/_data',
      created: new Date(Date.now() - 86400000),
      size: '245 MB',
      inUse: true,
      containers: ['postgres-db'],
    },
    {
      id: 'vol_2',
      name: 'app_logs',
      driver: 'local',
      mountpoint: '/var/lib/docker/volumes/app_logs/_data',
      created: new Date(Date.now() - 172800000),
      size: '12.3 MB',
      inUse: true,
      containers: ['nginx-web'],
    },
    {
      id: 'vol_3',
      name: 'temp_storage',
      driver: 'local',
      mountpoint: '/var/lib/docker/volumes/temp_storage/_data',
      created: new Date(Date.now() - 259200000),
      size: '0 B',
      inUse: false,
      containers: [],
    },
  ]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(volumes.map(v => v.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectVolume = (volumeId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedVolumes, volumeId]);
    } else {
      onSelectionChange(selectedVolumes.filter(id => id !== volumeId));
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
                  checked={selectedVolumes.length === volumes.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Mount Point</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Containers</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {volumes.map(volume => (
              <TableRow key={volume.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedVolumes.includes(volume.id)}
                    onCheckedChange={checked =>
                      handleSelectVolume(volume.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell className="font-medium">{volume.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {volume.driver}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono max-w-xs truncate">
                  {volume.mountpoint}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(volume.created)} ago
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {volume.size}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={volume.inUse ? 'default' : 'secondary'}
                    className={
                      volume.inUse
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : ''
                    }
                  >
                    {volume.inUse ? 'In Use' : 'Unused'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {volume.containers.length > 0
                    ? volume.containers.join(', ')
                    : '-'}
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
                        <HardDrive className="mr-2 h-4 w-4" />
                        Inspect
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        disabled={volume.inUse}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
