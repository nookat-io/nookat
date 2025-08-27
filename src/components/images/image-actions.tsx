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
  onSelectionChange?: (selected: string[]) => void;
}

export function ImageActions({
  selectedImages,
  onRefresh,
  onSelectionClear,
  onSelectionChange,
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
      // Delete all selected images in parallel using Promise.allSettled
      const deletePromises = selectedImages.map(async imageId => {
        try {
          await invoke('delete_image', { imageId });
          return { success: true, imageId, error: null };
        } catch (error) {
          console.error(`Error deleting image ${imageId}:`, error);
          return { success: false, imageId, error };
        }
      });

      const results = await Promise.allSettled(deletePromises);

      // Collect succeeded and failed IDs
      const succeededIds: string[] = [];
      const failedResults: Array<{ imageId: string; error: unknown }> = [];

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { success, imageId, error } = result.value;
          if (success) {
            succeededIds.push(imageId);
          } else {
            failedResults.push({ imageId, error });
          }
        } else {
          // Promise was rejected (shouldn't happen with allSettled, but handle it)
          console.error('Unexpected promise rejection:', result.reason);
        }
      });

      // Handle selection state based on results
      if (failedResults.length > 0) {
        // Some deletions failed - reselect only the failed ones
        if (onSelectionChange) {
          const failedIds = failedResults.map(r => r.imageId);
          onSelectionChange(failedIds);
        }

        // Log errors for failed deletions
        console.error('Failed to delete some images:', failedResults);

        // Show user-friendly error message
        const errorMessage = `Failed to delete ${failedResults.length} of ${selectedImages.length} images. Check console for details.`;
        alert(errorMessage);
      } else {
        // All deletions succeeded - clear selection
        if (onSelectionChange) {
          onSelectionChange([]);
        } else if (onSelectionClear) {
          onSelectionClear();
        }
      }

      // Handle refresh calls efficiently
      if (onRefresh) {
        if (succeededIds.length > 0) {
          // If engine-events are enabled, we could do a single consolidated refresh
          // For now, refresh for each succeeded deletion
          succeededIds.forEach(imageId => {
            onRefresh(imageId);
          });
        }
      }
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      alert('Failed to process bulk delete operation: ' + error);
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
