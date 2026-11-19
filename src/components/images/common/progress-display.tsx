import { CheckCircle, AlertCircle, CircleSlash } from 'lucide-react';
import { Progress } from '../../ui/progress';
import { ProgressState } from './types';
import { PullSummary, describePull } from './pull-summary';

const WAITING_FOR_REGISTRY = 'Waiting for the registry';

interface ProgressDisplayProps {
  progress: ProgressState;
  pullSummary: PullSummary | null;
}

export function ProgressDisplay({
  progress,
  pullSummary,
}: ProgressDisplayProps) {
  if (
    !progress.isRunning &&
    !progress.progress &&
    !progress.error &&
    !progress.success
  ) {
    return null;
  }

  if (progress.error) {
    return (
      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-muted-foreground mt-1">
              {progress.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (progress.isRunning) {
    const percentage = pullSummary?.percentage ?? null;
    const details =
      (pullSummary && describePull(pullSummary)) ?? WAITING_FOR_REGISTRY;
    return (
      <div className="p-4 rounded-lg border space-y-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span>{progress.progress}</span>
          {percentage !== null && (
            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
              {percentage}%
            </span>
          )}
        </div>
        <Progress
          value={percentage}
          aria-label="Pull progress"
          className="h-2"
        />
        <p className="text-sm tabular-nums text-muted-foreground">{details}</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-center space-x-2">
        {progress.success && <CheckCircle className="h-4 w-4 text-green-500" />}
        {progress.cancelled && (
          <CircleSlash className="h-4 w-4 text-muted-foreground" />
        )}
        <span>{progress.progress}</span>
      </div>
    </div>
  );
}
