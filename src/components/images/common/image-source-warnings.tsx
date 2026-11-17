import { AlertTriangle, Info } from 'lucide-react';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { Dialog } from '../../ui/dialog';
import { ImageSourceCheck } from '../../../lib/image-source';

type LookalikeCheck = Extract<
  ImageSourceCheck,
  { kind: 'lookalike-registry' | 'lookalike-image' }
>;

const isLookalike = (check: ImageSourceCheck): check is LookalikeCheck =>
  check.kind === 'lookalike-registry' || check.kind === 'lookalike-image';

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
  if (isLookalike(check)) {
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
  check: ImageSourceCheck | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ImageSourceConfirmDialog({
  check,
  onCancel,
  onConfirm,
}: ImageSourceConfirmDialogProps) {
  const lookalike = check && isLookalike(check) ? check : null;

  return (
    <Dialog
      open={lookalike !== null}
      onOpenChange={open => {
        if (!open) {
          onCancel();
        }
      }}
    >
      {lookalike && (
        <ConfirmDialog
          title={confirmationTitle(lookalike)}
          description={`${lookalikeSummary(lookalike)} Lookalike names are a common way to spread malicious images, so check the spelling before you pull.`}
          confirmText="Pull anyway"
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
    </Dialog>
  );
}
