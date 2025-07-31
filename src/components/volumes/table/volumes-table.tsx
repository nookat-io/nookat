'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Checkbox } from '../../ui/checkbox';
import { Button } from '../../ui/button';
import { Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { VolumeData } from '../data/volume-data-provider';
import { VolumeActionService } from '../utils/volume-actions';
import { useState } from 'react';

interface VolumesTableProps {
  selectedVolumes: string[];
  onSelectionChange: (_selected: string[]) => void;
  volumes: VolumeData[];
  onActionComplete?: () => void;
}

export function VolumesTable({
  selectedVolumes,
  onSelectionChange,
  volumes,
  onActionComplete,
}: VolumesTableProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Sort volumes by name for consistent rendering
  const sortedVolumes = [...volumes].sort((a, b) =>
    a.name.localeCompare(b.name)
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedVolumes.length === sortedVolumes.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[40%]">Name</TableHead>
              <TableHead className="w-[10%]">Driver</TableHead>
              <TableHead className="w-[10%]">Scope</TableHead>
              <TableHead className="w-[30%]">Mount Point</TableHead>
              <TableHead className="w-[10%] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedVolumes.map(volume => (
              <TableRow key={volume.name}>
                <TableCell>
                  <Checkbox
                    checked={selectedVolumes.includes(volume.name)}
                    onCheckedChange={checked =>
                      handleSelectVolume(volume.name, checked as boolean)
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
