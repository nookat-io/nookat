import { useState } from 'react';
import { Button } from '../../ui/button';
import { Dialog, DialogTrigger } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { BrushCleaning, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { Image, ImagePruneScope } from '../image-types';
import { countImages, imageName, imagesToPrune } from '../image-prune';
import { formatBytes } from '../../../utils/format';

interface PruneConfirmDialogProps {
  open: boolean;
  isPruning: boolean;
  images: Image[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (scope: ImagePruneScope) => void;
}

interface ScopeOption {
  scope: ImagePruneScope;
  label: string;
  description: string;
  nothingToRemove: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    scope: 'all_unused',
    label: 'All unused images',
    description:
      'Every image that no container uses, tagged or not, like docker image prune -a.',
    nothingToRemove: 'No unused images to remove.',
  },
  {
    scope: 'dangling',
    label: 'Dangling images only',
    description: 'Only images without a tag, like docker image prune.',
    nothingToRemove: 'No dangling images to remove.',
  },
];

const confirmText = (isPruning: boolean, count: number) => {
  if (isPruning) {
    return 'Pruning...';
  }
  if (count === 0) {
    return 'Nothing to Remove';
  }
  return `Remove ${count} Image${count === 1 ? '' : 's'}`;
};

export function PruneConfirmDialog({
  open,
  isPruning,
  images,
  onOpenChange,
  onConfirm,
}: PruneConfirmDialogProps) {
  const [scope, setScope] = useState<ImagePruneScope>('all_unused');

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setScope('all_unused');
    }
    onOpenChange(nextOpen);
  };

  const chosenOption =
    SCOPE_OPTIONS.find(option => option.scope === scope) ?? SCOPE_OPTIONS[0];
  const chosenImages = imagesToPrune(images, scope);
  const chosenCount = countImages(chosenImages);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenChange(true)}
          disabled={isPruning}
        >
          <BrushCleaning className="mr-2 h-4 w-4" />
          {isPruning ? 'Pruning...' : 'Prune Unused'}
        </Button>
      </DialogTrigger>
      <ConfirmDialog
        title="Prune unused images?"
        description={
          <div className="space-y-3">
            <p
              id="prune-scope-label"
              className="text-sm font-medium text-foreground"
            >
              Remove
            </p>
            <RadioGroup
              aria-labelledby="prune-scope-label"
              value={scope}
              onValueChange={value => setScope(value as ImagePruneScope)}
              disabled={isPruning}
            >
              {SCOPE_OPTIONS.map(option => (
                <div key={option.scope} className="flex items-start gap-2">
                  <RadioGroupItem
                    id={`prune-scope-${option.scope}`}
                    value={option.scope}
                    aria-describedby={`prune-scope-${option.scope}-description`}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor={`prune-scope-${option.scope}`}>
                      {`${option.label} (${countImages(imagesToPrune(images, option.scope))})`}
                    </Label>
                    <p
                      id={`prune-scope-${option.scope}-description`}
                      className="text-xs text-muted-foreground"
                    >
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            <ul
              aria-label="Images to remove"
              className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm text-muted-foreground"
            >
              {chosenImages.length > 0 ? (
                chosenImages.map(image => (
                  <li
                    key={image.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate font-mono">
                      {imageName(image)}
                    </span>
                    <span className="shrink-0 text-xs">
                      {formatBytes(image.size)}
                    </span>
                  </li>
                ))
              ) : (
                <li>{chosenOption.nothingToRemove}</li>
              )}
            </ul>
            <div className="rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p>
                  Tagged images you pulled can be pulled again, but images built
                  on this machine have to be built again.
                </p>
                <p className="mt-1">This cannot be undone.</p>
              </div>
            </div>
          </div>
        }
        showCancel
        confirmText={confirmText(isPruning, chosenCount)}
        onConfirm={() => onConfirm(scope)}
        onCancel={() => handleOpenChange(false)}
        confirmDisabled={isPruning || chosenCount === 0}
      />
    </Dialog>
  );
}
