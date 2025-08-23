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
import { Play, Trash2, Tag, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { Image } from './image-types';
import { formatBytes } from '../../utils/format';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ui/error-display';
import { SortableTableHeader } from '../ui/sortable-table-header';
import { useTableSort } from '../../hooks/use-table-sort';

interface ImagesTableProps {
  selectedImages: string[];
  onSelectionChange: (_selected: string[]) => void;
  images: Image[];
  onActionComplete?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ImagesTable({
  selectedImages,
  onSelectionChange,
  images,
  isLoading = false,
  error = null,
  onRetry,
}: ImagesTableProps) {
  const { sortedData: sortedImages, handleSort } = useTableSort(
    images,
    'created',
    'desc'
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(sortedImages.map(img => img.id));
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

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={8}>
            <div className="flex items-center justify-center">
              <LoadingSpinner message="Loading images..." size="lg" />
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

    if (sortedImages.length === 0) {
      return <></>;
    }

    return sortedImages.map(image => (
      <TableRow key={image.id}>
        <TableCell>
          <Checkbox
            checked={selectedImages.includes(image.id)}
            onCheckedChange={checked =>
              handleSelectImage(image.id, checked as boolean)
            }
          />
        </TableCell>
        <TableCell className="font-medium max-w-[200px]">
          <div className="truncate max-w-full" title={image.repository || ''}>
            {image.repository}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground max-w-[150px]">
          <div className="truncate max-w-full" title={image.tag || ''}>
            {image.tag}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-center">
          {formatDistanceToNow(new Date(image.created * 1000), {
            addSuffix: true,
          })}
        </TableCell>
        <TableCell className="text-muted-foreground text-center">
          {formatBytes(image.size)}
        </TableCell>
        <TableCell className="text-center">
          <Badge
            variant={image.in_use ? 'default' : 'secondary'}
            className={
              image.in_use
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : ''
            }
          >
            {image.in_use ? 'In Use' : 'Unused'}
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

              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
                  checked={
                    selectedImages.length === sortedImages.length &&
                    sortedImages.length > 0
                  }
                  onCheckedChange={checked =>
                    handleSelectAll(checked as boolean)
                  }
                />
              </TableHead>
              <SortableTableHeader
                sortKey="repository"
                onSort={handleSort}
                className="w-[35%]"
              >
                Name
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="tag"
                onSort={handleSort}
                className="w-[15%]"
              >
                Tag
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="created"
                onSort={handleSort}
                className="w-[10%]"
              >
                Created
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="size"
                onSort={handleSort}
                className="w-[10%]"
              >
                Size
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="inUse"
                onSort={handleSort}
                className="w-[10%]"
              >
                Status
              </SortableTableHeader>
              <TableHead className="w-[10%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="flex-1">{renderTableBody()}</TableBody>
        </Table>
      </div>
    </div>
  );
}
