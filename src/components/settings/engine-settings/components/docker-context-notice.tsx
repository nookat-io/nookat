import { ArrowRightLeft, CircleCheck } from 'lucide-react';
import { Button } from '../../../ui/button';
import { DockerCliContext } from '../types';

interface DockerContextNoticeProps {
  context: DockerCliContext;
  isSwitching: boolean;
  error: string | null;
  onSwitchToColima: () => void;
}

export function DockerContextNotice({
  context,
  isSwitching,
  error,
  onSwitchToColima,
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

  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
      <div>
        <p className="text-sm font-medium">
          docker commands in your terminal use another engine
        </p>
        <p className="mt-1 text-sm">
          The current Docker context is &quot;{context.name}&quot;
          {context.host ? ` (${context.host})` : ''}, so docker in a terminal
          does not reach Colima.
        </p>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onSwitchToColima}
        disabled={isSwitching}
      >
        <ArrowRightLeft className="h-4 w-4 mr-2" />
        {isSwitching ? 'Switching...' : 'Use Colima for docker commands'}
      </Button>
    </div>
  );
}
