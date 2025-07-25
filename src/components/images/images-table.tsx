'use client';

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
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ImageData } from './image-data-provider';
import { formatBytes } from '../../utils/format';

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
  images: ImageData[];
  isLoading: boolean;
  error: string | null;
}



// Convert ImageData to DockerImage format for display
function convertImageData(imageData: ImageData): DockerImage {
  const repository = imageData.repository || '<none>';
  const tag = imageData.tag || '<none>';
  
  return {
    id: imageData.id,
    repository,
    tag,
    imageId: imageData.image_id,
    created: new Date(imageData.created * 1000), // Convert Unix timestamp to Date
    size: formatBytes(imageData.size),
    inUse: imageData.in_use,
  };
}

export function ImagesTable({ 
  filter, 
  selectedImages, 
  onSelectionChange,
  images,
  isLoading,
  error
}: ImagesTableProps) {
  const dockerImages = images.map(convertImageData);

  const filteredImages = dockerImages.filter(image => {
    if (filter === 'used') return image.inUse;
    if (filter === 'dangling') return image.repository === '<none>' || image.tag === '<none>';
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

  if (isLoading) {
    return (
      <div className="border rounded-lg p-8">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <div className="text-muted-foreground">Loading images...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="text-destructive">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selectedImages.length === filteredImages.length && filteredImages.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="w-[30%]">Name</TableHead>
            <TableHead className="w-[15%]">Tag</TableHead>
            <TableHead className="w-[15%]">Image ID</TableHead>
            <TableHead className="w-[15%]">Created</TableHead>
            <TableHead className="w-[10%]">Size</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredImages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                {images.length === 0 ? 'No Docker images found' : `No images match the "${filter}" filter`}
              </TableCell>
            </TableRow>
          ) : (
            filteredImages.map((image) => (
              <TableRow key={image.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedImages.includes(image.id)}
                    onCheckedChange={(checked) => 
                      handleSelectImage(image.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="truncate" title={image.repository}>
                    {image.repository}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="truncate" title={image.tag}>
                    {image.tag}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">
                  {image.imageId.startsWith('sha256:') 
                    ? image.imageId.substring(7, 19) 
                    : image.imageId.substring(0, 12)}
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
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}