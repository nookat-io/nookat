'use client';

import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Terminal, 
  MoreHorizontal,
  ExternalLink 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface Container {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused';
  created: Date;
  ports: string[];
  cpu: number;
  memory: string;
}

interface ContainersTableProps {
  filter: 'all' | 'running' | 'stopped';
  selectedContainers: string[];
  onSelectionChange: (_selected: string[]) => void;
}

export function ContainersTable({ 
  filter, 
  selectedContainers, 
  onSelectionChange 
}: ContainersTableProps) {
  const [containers] = useState<Container[]>([
    {
      id: 'cont_1',
      name: 'nginx-web',
      image: 'nginx:alpine',
      status: 'running',
      created: new Date(Date.now() - 86400000),
      ports: ['80:80', '443:443'],
      cpu: 2.1,
      memory: '64 MB'
    },
    {
      id: 'cont_2',
      name: 'postgres-db',
      image: 'postgres:15',
      status: 'running',
      created: new Date(Date.now() - 172800000),
      ports: ['5432:5432'],
      cpu: 8.5,
      memory: '256 MB'
    },
    {
      id: 'cont_3',
      name: 'redis-cache',
      image: 'redis:7-alpine',
      status: 'stopped',
      created: new Date(Date.now() - 259200000),
      ports: ['6379:6379'],
      cpu: 0,
      memory: '0 MB'
    },
  ]);

  const filteredContainers = containers.filter(container => {
    if (filter === 'running') return container.status === 'running';
    if (filter === 'stopped') return container.status === 'stopped';
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedContainers.length === filteredContainers.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Ports</TableHead>
              <TableHead>CPU</TableHead>
              <TableHead>Memory</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContainers.map((container) => (
              <TableRow key={container.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedContainers.includes(container.id)}
                    onCheckedChange={(checked) => 
                      handleSelectContainer(container.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell className="font-medium">{container.name}</TableCell>
                <TableCell className="text-muted-foreground">{container.image}</TableCell>
                <TableCell>
                  <Badge 
                    variant={container.status === 'running' ? 'default' : 'secondary'}
                    className={
                      container.status === 'running' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                        : ''
                    }
                  >
                    {container.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(container.created)} ago
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {container.ports.join(', ') || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {container.cpu}%
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {container.memory}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {container.status === 'running' ? (
                        <>
                          <DropdownMenuItem>
                            <Square className="mr-2 h-4 w-4" />
                            Stop
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Terminal className="mr-2 h-4 w-4" />
                            Terminal
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Logs
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Start
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Restart
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
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