import { AlertTriangle, Info } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from '../ui/dialog';
import {
  ImageSourceCheck,
  LookalikeCheck,
  needsConfirmation,
} from '../../lib/image-source';

function lookalikeSummary(check: LookalikeCheck) {
  return check.kind === 'lookalike-registry'
    ? `${check.registry} looks like ${check.resembles.host} (${check.resembles.name}), but it is a different registry.`
    : `${check.image} looks like the official ${check.resembles} image, but it is a different image.`;
}

function confirmationTitle(check: LookalikeCheck) {
  return check.kind === 'lookalike-registry'
    ? `Pull from ${check.registry}?`
    : `Pull ${check.image}?`;
}

export function ImageSourceNote({ check }: { check: ImageSourceCheck }) {
  if (needsConfirmation(check)) {
    return (
      <p className="flex items-start gap-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {lookalikeSummary(check)} Check the spelling before you pull.
        </span>
      </p>
    );
  }
  if (check.kind === 'unknown-registry') {
    return (
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>
          {check.registry} is not a registry Nookat recognizes. Pull only images
          you trust.
        </span>
      </p>
    );
  }
  return null;
}

interface ImageSourceConfirmDialogProps {
  check: LookalikeCheck;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ImageSourceConfirmDialog({
  check,
  onCancel,
  onConfirm,
}: ImageSourceConfirmDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <ConfirmDialog
        title={confirmationTitle(check)}
        description={`${lookalikeSummary(check)} Lookalike names are a common way to spread malicious images, so check the spelling before you pull.`}
        confirmText="Pull anyway"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </Dialog>
  );
}
