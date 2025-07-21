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
  Trash2, 
  Upload, 
  Tag,
  MoreHorizontal 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  imageId: string;
  created: Date;
  size: string;
  inUse: boolean;
}

interface ImagesTableProps {
  filter: 'all' | 'used' | 'dangling';
  selectedImages: string[];
  onSelectionChange: (_selected: string[]) => void;
}

export function ImagesTable({ 
  filter, 
  selectedImages, 
  onSelectionChange 
}: ImagesTableProps) {
  const [images] = useState<DockerImage[]>([
    {
      id: 'img_1',
      repository: 'nginx',
      tag: 'alpine',
      imageId: 'sha256:abcd1234',
      created: new Date(Date.now() - 86400000),
      size: '23.4 MB',
      inUse: true
    },
    {
      id: 'img_2',
      repository: 'postgres',
      tag: '15',
      imageId: 'sha256:efgh5678',
      created: new Date(Date.now() - 172800000),
      size: '374 MB',
      inUse: true
    },
    {
      id: 'img_3',
      repository: 'redis',
      tag: '7-alpine',
      imageId: 'sha256:ijkl9012',
      created: new Date(Date.now() - 259200000),
      size: '32.3 MB',
      inUse: false
    },
    {
      id: 'img_4',
      repository: '<none>',
      tag: '<none>',
      imageId: 'sha256:mnop3456',
      created: new Date(Date.now() - 345600000),
      size: '128 MB',
      inUse: false
    },
  ]);

  const filteredImages = images.filter(image => {
    if (filter === 'used') return image.inUse;
    if (filter === 'dangling') return image.repository === '<none>';
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredImages.map(img => img.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectImage = (imageId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedImages, imageId]);
    } else {
      onSelectionChange(selectedImages.filter(id => id !== imageId));
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
                checked={selectedImages.length === filteredImages.length}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Repository</TableHead>
            <TableHead>Tag</TableHead>
            <TableHead>Image ID</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredImages.map((image) => (
            <TableRow key={image.id}>
              <TableCell>
                <Checkbox 
                  checked={selectedImages.includes(image.id)}
                  onCheckedChange={(checked) => 
                    handleSelectImage(image.id, checked as boolean)
                  }
                />
              </TableCell>
              <TableCell className="font-medium">{image.repository}</TableCell>
              <TableCell className="text-muted-foreground">{image.tag}</TableCell>
              <TableCell className="text-muted-foreground text-xs font-mono">
                {image.imageId.substring(7, 19)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(image.created)} ago
              </TableCell>
              <TableCell className="text-muted-foreground">{image.size}</TableCell>
              <TableCell>
                <Badge 
                  variant={image.inUse ? 'default' : 'secondary'}
                  className={
                    image.inUse 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                      : ''
                  }
                >
                  {image.inUse ? 'In Use' : 'Unused'}
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
                      <Play className="mr-2 h-4 w-4" />
                      Run Container
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Tag className="mr-2 h-4 w-4" />
                      Add Tag
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Upload className="mr-2 h-4 w-4" />
                      Push to Registry
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