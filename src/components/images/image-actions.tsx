'use client';

import { useState } from 'react';
import { PullImage } from './pull/pull-image-modal';
import { PruneResult } from './image-types';
import { ImageActionService } from './image-actions-service';
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
    const result = await ImageActionService.pruneImages();
    setIsPruning(false);
    setConfirmPruneDialogOpen(false);
    if (result) {
      setPruneResult(result);
      setPruneDialogOpen(true);
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    setConfirmDeleteDialogOpen(false);

    const deletedIds = await ImageActionService.deleteImages(selectedImages);
    onImagesDeleted?.(deletedIds);
    onSelectionChange?.(
      selectedImages.filter(imageId => !deletedIds.includes(imageId))
    );
    setIsDeleting(false);
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
