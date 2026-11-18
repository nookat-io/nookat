import { ConfirmDialog } from '../../../common/ConfirmDialog';
import { Dialog } from '../../../ui/dialog';

interface StartEnginePromptProps {
  open: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

export function StartEnginePrompt({
  open,
  onStart,
  onDismiss,
}: StartEnginePromptProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onDismiss()}>
      <ConfirmDialog
        title="Start the engine?"
        description="Colima is installed. Start the engine now to run containers, or change the VM resources first and start it from Engine Actions."
        confirmText="Start Engine"
        confirmVariant="default"
        cancelText="Not now"
        onConfirm={onStart}
        onCancel={onDismiss}
      />
    </Dialog>
  );
}
