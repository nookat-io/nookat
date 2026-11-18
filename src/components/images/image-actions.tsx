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
  onImagesDeleted?: (imageIds: string[]) => void;
  onSelectionChange?: (selected: string[]) => void;
}

export function ImageActions({
  selectedImages,
  onImagesDeleted,
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
      setConfirmPruneDialogOpen(false);
      setPruneDialogOpen(true);
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
      const results = await Promise.allSettled(
        selectedImages.map(imageId => invoke('delete_image', { imageId }))
      );

      const deletedIds = selectedImages.filter(
        (_, index) => results[index].status === 'fulfilled'
      );
      const failures = results.flatMap((result, index) =>
        result.status === 'rejected'
          ? [{ imageId: selectedImages[index], error: result.reason }]
          : []
      );

      onImagesDeleted?.(deletedIds);
      onSelectionChange?.(failures.map(failure => failure.imageId));

      if (failures.length > 0) {
        console.error('Failed to delete some images:', failures);
        alert(
          `Failed to delete ${failures.length} of ${selectedImages.length} images. Check console for details.`
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <PullImage />

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
