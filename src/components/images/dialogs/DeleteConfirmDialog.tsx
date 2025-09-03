'use client';

import { Dialog, DialogTrigger } from '../../ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
import { ConfirmDialog } from '../../common/ConfirmDialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  isDeleting: boolean;
  selectedCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  isDeleting,
  selectedCount,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onOpenChange(true)}
          disabled={isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}
        </Button>
      </DialogTrigger>
      <ConfirmDialog
        title="Confirm Delete Operation"
        description={
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>You're about to delete</span>
              <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                {selectedCount} image{selectedCount > 1 ? 's' : ''}
              </span>
            </div>
            <div className="rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p>Deletion is permanent and cannot be undone.</p>
                <p className="mt-1">Are you sure you want to continue?</p>
              </div>
            </div>
          </div>
        }
        showCancel
        confirmText={isDeleting ? 'Deleting...' : 'Delete Images'}
        onConfirm={onConfirm}
        onCancel={() => onOpenChange(false)}
        confirmDisabled={isDeleting}
      />
    </Dialog>
  );
}
