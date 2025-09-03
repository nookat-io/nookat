'use client';

import { Button } from '../../ui/button';
import { Dialog, DialogTrigger } from '../../ui/dialog';
import { Trash, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '../../common/ConfirmDialog';

interface PruneConfirmDialogProps {
  open: boolean;
  isPruning: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function PruneConfirmDialog({
  open,
  isPruning,
  onOpenChange,
  onConfirm,
}: PruneConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(true)}
          disabled={isPruning}
        >
          <Trash className="mr-2 h-4 w-4" />
          {isPruning ? 'Pruning...' : 'Prune Unused'}
        </Button>
      </DialogTrigger>
      <ConfirmDialog
        title="Confirm Prune Operation"
        description={
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              This will remove all images that are not used by any containers.
            </div>
            <div className="rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p>This action cannot be undone and will free up space.</p>
                <p className="mt-1">Are you sure you want to continue?</p>
              </div>
            </div>
          </div>
        }
        showCancel
        confirmText={isPruning ? 'Pruning...' : 'Prune Images'}
        onConfirm={onConfirm}
        onCancel={() => onOpenChange(false)}
        confirmDisabled={isPruning}
      />
    </Dialog>
  );
}
