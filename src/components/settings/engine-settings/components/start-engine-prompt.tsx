import { ConfirmDialog } from '../../../common/ConfirmDialog';
import { Dialog } from '../../../ui/dialog';

interface StartEnginePromptProps {
  open: boolean;
  otherEngineName: string | null;
  onStart: () => void;
  onDismiss: () => void;
}

function promptDescription(otherEngineName: string | null) {
  if (otherEngineName) {
    return `Colima is installed. Starting it switches Nookat and docker commands in your terminal from ${otherEngineName} to Colima. You can also change the VM resources first and start it from Engine Actions.`;
  }
  return 'Colima is installed. Start the engine now to run containers, or change the VM resources first and start it from Engine Actions.';
}

export function StartEnginePrompt({
  open,
  otherEngineName,
  onStart,
  onDismiss,
}: StartEnginePromptProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onDismiss()}>
      <ConfirmDialog
        title="Start the engine?"
        description={promptDescription(otherEngineName)}
        confirmText="Start Engine"
        confirmVariant="default"
        cancelText="Not now"
        onConfirm={onStart}
        onCancel={onDismiss}
      />
    </Dialog>
  );
}
