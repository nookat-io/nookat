'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Trash2, Trash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { invoke } from '@tauri-apps/api/core';
import { formatBytes } from '../../utils/format';
import { PruneResult } from './image-types';

interface ImageActionsProps {
  selectedImages: string[];
  onRefresh?: (deletedImageId?: string) => void;
  onSelectionClear?: () => void;
}

export function ImageActions({
  selectedImages,
  onRefresh,
  onSelectionClear,
}: ImageActionsProps) {
  const [isPruning, setIsPruning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pruneDialogOpen, setPruneDialogOpen] = useState(false);
  const [confirmPruneDialogOpen, setConfirmPruneDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [pruneResult, setPruneResult] = useState<PruneResult | null>(null);

  const handlePrune = async () => {
    setIsPruning(true);
    setConfirmPruneDialogOpen(false);
    try {
      const result = await invoke<PruneResult>('prune_images');
      setPruneResult(result);
      setPruneDialogOpen(true);
      // Refresh the image list after pruning
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error pruning images:', error);
      alert('Failed to prune images: ' + error);
    } finally {
      setIsPruning(false);
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    setConfirmDeleteDialogOpen(false);

    try {
      // Delete each selected image
      for (const imageId of selectedImages) {
        await invoke('delete_image', { imageId });
      }

      // Clear the selection after successful deletion
      if (onSelectionClear) {
        onSelectionClear();
      }

      // Refresh the image list after deletion
      if (onRefresh) {
        // Notify about each deleted image
        for (const imageId of selectedImages) {
          onRefresh(imageId);
        }
      }
    } catch (error) {
      console.error('Error deleting images:', error);
      alert('Failed to delete images: ' + error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Prune Confirmation Dialog */}
      <Dialog
        open={confirmPruneDialogOpen}
        onOpenChange={setConfirmPruneDialogOpen}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmPruneDialogOpen(true)}
            disabled={isPruning}
          >
            <Trash className="mr-2 h-4 w-4" />
            {isPruning ? 'Pruning...' : 'Prune Unused'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Prune Operation</DialogTitle>
            <DialogDescription>
              This will remove all unused images from your system. This action
              cannot be undone. Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPruneDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePrune}
              disabled={isPruning}
            >
              {isPruning ? 'Pruning...' : 'Prune Images'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Selected Confirmation Dialog */}
      {selectedImages.length > 0 && (
        <Dialog
          open={confirmDeleteDialogOpen}
          onOpenChange={setConfirmDeleteDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting
                ? 'Deleting...'
                : `Delete Selected (${selectedImages.length})`}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete Operation</DialogTitle>
              <DialogDescription>
                This will permanently delete {selectedImages.length} selected
                image{selectedImages.length > 1 ? 's' : ''}. This action cannot
                be undone. Are you sure you want to continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Images'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Prune Results Dialog */}
      <Dialog open={pruneDialogOpen} onOpenChange={setPruneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prune Results</DialogTitle>
            <DialogDescription>
              {pruneResult ? (
                <div className="space-y-2">
                  <p>
                    Successfully removed {pruneResult.images_deleted.length}{' '}
                    unused images.
                  </p>
                  <p>
                    Space reclaimed: {formatBytes(pruneResult.space_reclaimed)}
                  </p>
                  {pruneResult.images_deleted.length > 0 && (
                    <div>
                      <p className="font-medium">Deleted images:</p>
                      <div className="max-h-32 overflow-y-auto text-sm text-muted-foreground">
                        {pruneResult.images_deleted.map((imageId, index) => (
                          <div key={index} className="font-mono">
                            {imageId.substring(0, 12)}...
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                'No unused images found to remove.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setPruneDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
