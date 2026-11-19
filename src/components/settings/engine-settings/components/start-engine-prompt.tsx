import { ConfirmDialog } from '../../../common/ConfirmDialog';
import { Dialog } from '../../../ui/dialog';
import { colimaStartEffect } from './colima-start-effect';

interface StartEnginePromptProps {
  open: boolean;
  otherEngineName: string | null;
  activatesDockerContext: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

function promptDescription(
  otherEngineName: string | null,
  activatesDockerContext: boolean
) {
  if (otherEngineName) {
    return `Colima is installed. ${colimaStartEffect(otherEngineName, activatesDockerContext)} You can also change the VM resources first and start it from Engine Actions.`;
  }
  return 'Colima is installed. Start the engine now to run containers, or change the VM resources first and start it from Engine Actions.';
}

export function StartEnginePrompt({
  open,
  otherEngineName,
  activatesDockerContext,
  onStart,
  onDismiss,
}: StartEnginePromptProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onDismiss()}>
      <ConfirmDialog
        title="Start the engine?"
        description={promptDescription(otherEngineName, activatesDockerContext)}
        confirmText="Start Engine"
        confirmVariant="default"
        cancelText="Not now"
        onConfirm={onStart}
        onCancel={onDismiss}
      />
    </Dialog>
  );
}
