'use client';

import { useState } from 'react';
import { PullImage } from './pull/pull-image-modal';
import { invoke } from '@tauri-apps/api/core';
import { PruneResult } from './image-types';
import { PruneConfirmDialog } from './dialogs/PruneConfirmDialog';
import { DeleteConfirmDialog } from './dialogs/DeleteConfirmDialog';
import { PruneResultsDialog } from './dialogs/PruneResultsDialog';

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
    try {
      const result = await invoke<PruneResult>('prune_images');
      setPruneResult(result);
      // Close confirm dialog only after operation completes
      setConfirmPruneDialogOpen(false);
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
      <PullImage onSuccess={onRefresh} />

      <PruneConfirmDialog
        open={confirmPruneDialogOpen}
        isPruning={isPruning}
        onOpenChange={setConfirmPruneDialogOpen}
        onConfirm={handlePrune}
      />

      {selectedImages.length > 0 && (
        <DeleteConfirmDialog
          open={confirmDeleteDialogOpen}
          isDeleting={isDeleting}
          selectedCount={selectedImages.length}
          onOpenChange={setConfirmDeleteDialogOpen}
          onConfirm={handleDeleteSelected}
        />
      )}

      <PruneResultsDialog
        open={pruneDialogOpen}
        result={pruneResult}
        onOpenChange={setPruneDialogOpen}
      />
    </div>
  );
}
