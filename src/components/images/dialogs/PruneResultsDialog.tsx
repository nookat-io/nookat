'use client';

import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { PruneResult } from '../image-types';
import { formatBytes } from '../../../utils/format';
import { CheckCircle2, HardDrive } from 'lucide-react';

interface PruneResultsDialogProps {
  open: boolean;
  result: PruneResult | null;
  onOpenChange: (open: boolean) => void;
}

export function PruneResultsDialog({
  open,
  result,
  onOpenChange,
}: PruneResultsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prune Results</DialogTitle>
          <DialogDescription>
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Prune completed successfully</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {result.images_deleted.length} removed
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    <HardDrive className="h-3 w-3" />{' '}
                    {formatBytes(result.space_reclaimed)} reclaimed
                  </span>
                </div>

                {result.images_deleted.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium">Deleted images</p>
                    <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm text-muted-foreground">
                      {result.images_deleted.map((imageId, index) => (
                        <div key={index} className="font-mono">
                          {imageId.substring(0, 12)}...
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-muted-foreground">
                No unused images found to remove.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
