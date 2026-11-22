import { Button } from '../../ui/button';
import { Dialog, DialogTrigger } from '../../ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '../../common/ConfirmDialog';

interface ContainerForceDeleteConfirmDialogProps {
  open: boolean;
  isDeleting: boolean;
  containerCount: number;
  runningContainerNames: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const describeContainers = (count: number) =>
  count === 1 ? '1 container' : `${count} containers`;

export function ContainerForceDeleteConfirmDialog({
  open,
  isDeleting,
  containerCount,
  runningContainerNames,
  onOpenChange,
  onConfirm,
}: ContainerForceDeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(true)}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? 'Deleting...' : 'Force Delete'}
        </Button>
      </DialogTrigger>
      <ConfirmDialog
        title="Confirm Force Delete"
        description={
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              This will delete {describeContainers(containerCount)}.
            </div>
            <div className="rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p>
                  These running containers will be killed without a graceful
                  shutdown:
                </p>
                <ul className="mt-1 list-disc pl-5 font-mono">
                  {runningContainerNames.map(name => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <p className="mt-1">
                  This action cannot be undone. Are you sure you want to
                  continue?
                </p>
              </div>
            </div>
          </div>
        }
        showCancel
        confirmText={isDeleting ? 'Deleting...' : 'Force Delete Containers'}
        onConfirm={onConfirm}
        onCancel={() => onOpenChange(false)}
        confirmDisabled={isDeleting}
      />
    </Dialog>
  );
}
