import { ArrowRightLeft, CircleCheck } from 'lucide-react';
import { Button } from '../../../ui/button';
import { ConnectedEngine, DockerCliContext } from '../types';

interface DockerContextNoticeProps {
  context: DockerCliContext;
  isSwitching: boolean;
  error: string | null;
  onSwitchToColima: () => void;
  otherEngine: ConnectedEngine | null;
}

function describeContext(context: DockerCliContext) {
  const endpoint = context.host ? ` (${context.host})` : '';
  return `The current Docker context is "${context.name}"${endpoint}`;
}

function otherEngineTitle(
  context: DockerCliContext,
  otherEngine: ConnectedEngine
) {
  if (context.host === otherEngine.endpoint) {
    return `Nookat and docker commands in your terminal use ${otherEngine.name}`;
  }
  return `Nookat uses ${otherEngine.name}, not Colima`;
}

function otherEngineNotice(
  context: DockerCliContext,
  otherEngine: ConnectedEngine | null
) {
  if (otherEngine) {
    return {
      title: otherEngineTitle(context, otherEngine),
      message: `${describeContext(context)}. Switch it to Colima to use this VM.`,
      action: 'Switch to Colima',
    };
  }
  return {
    title: 'docker commands in your terminal use another engine',
    message: `${describeContext(context)}, so docker in a terminal does not reach Colima.`,
    action: 'Use Colima for docker commands',
  };
}

export function DockerContextNotice({
  context,
  isSwitching,
  error,
  onSwitchToColima,
  otherEngine,
}: DockerContextNoticeProps) {
  if (context.uses_colima) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CircleCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
        docker commands in your terminal use Colima (context &quot;
        {context.name}&quot;)
      </p>
    );
  }

  const notice = otherEngineNotice(context, otherEngine);

  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
      <div>
        <p className="text-sm font-medium">{notice.title}</p>
        <p className="mt-1 text-sm">{notice.message}</p>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onSwitchToColima}
        disabled={isSwitching}
      >
        <ArrowRightLeft className="h-4 w-4 mr-2" />
        {isSwitching ? 'Switching...' : notice.action}
      </Button>
    </div>
  );
}
