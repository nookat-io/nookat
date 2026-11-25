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
import { describeImageCount, prunedImageName } from '../image-prune';
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
  const removedImages = result?.images_deleted ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prune Results</DialogTitle>
          {result && removedImages.length > 0 ? (
            <DialogDescription className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Prune completed successfully</span>
            </DialogDescription>
          ) : (
            <DialogDescription>No images were removed.</DialogDescription>
          )}
        </DialogHeader>
        {result && removedImages.length > 0 && (
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                {describeImageCount(removedImages.length)} removed
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                <HardDrive className="h-3 w-3" aria-hidden="true" />{' '}
                {formatBytes(result.space_reclaimed)} reclaimed
              </span>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Removed images</p>
              <ul className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2">
                {removedImages.map(image => (
                  <li key={image.id} className="font-mono">
                    {prunedImageName(image)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
