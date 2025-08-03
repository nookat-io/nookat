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

interface ImageActionsProps {
  selectedImages: string[];
  onRefresh?: () => void;
}

interface PruneResult {
  images_deleted: string[];
  space_reclaimed: number;
}

export function ImageActions({ selectedImages, onRefresh }: ImageActionsProps) {
  const [isPruning, setIsPruning] = useState(false);
  const [pruneDialogOpen, setPruneDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pruneResult, setPruneResult] = useState<PruneResult | null>(null);

  const handlePrune = async () => {
    setIsPruning(true);
    setConfirmDialogOpen(false);
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

  return (
    <div className="flex items-center gap-2">
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDialogOpen(true)}
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
              onClick={() => setConfirmDialogOpen(false)}
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

      {/* Results Dialog */}
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

      {selectedImages.length > 0 && (
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Selected ({selectedImages.length})
        </Button>
      )}
    </div>
  );
}
