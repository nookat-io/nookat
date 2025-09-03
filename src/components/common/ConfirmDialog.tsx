'use client';

import { ReactNode } from 'react';
import { Button } from '../ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface ConfirmDialogProps {
  title: string;
  description?: ReactNode;
  showCancel?: boolean;
  confirmText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  title,
  description,
  showCancel = true,
  confirmText = 'Confirm',
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>
            <div className="pt-6 space-y-3 text-muted-foreground leading-relaxed">
              {description}
            </div>
          </DialogDescription>
        ) : null}
      </DialogHeader>
      <DialogFooter className="pt-6">
        {showCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
