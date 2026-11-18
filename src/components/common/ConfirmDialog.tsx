import { ReactNode } from 'react';
import { Button, ButtonProps } from '../ui/button';
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
  confirmVariant?: ButtonProps['variant'];
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  title,
  description,
  showCancel = true,
  confirmText = 'Confirm',
  confirmVariant = 'destructive',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription asChild>
            <div className="pt-6 space-y-3 text-muted-foreground leading-relaxed">
              {description}
            </div>
          </DialogDescription>
        ) : null}
      </DialogHeader>
      <DialogFooter className="pt-6">
        {showCancel && (
          <Button variant="outline" onClick={onCancel}>
            {cancelText}
          </Button>
        )}
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
