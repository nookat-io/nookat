import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Progress } from '../../../ui/progress';
import { Badge } from '../../../ui/badge';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  InstallationProgress as ProgressType,
  InstallationStep,
} from '../types';

interface InstallationProgressProps {
  step: InstallationStep;
  progress: ProgressType;
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

export function InstallationProgress({
  step,
  progress,
  error,
  onRetry,
  className = '',
}: InstallationProgressProps) {
  const isActive =
    step === 'installing' || step === 'starting-vm' || step === 'validating';
  const isComplete = step === 'complete';
  const hasError = step === 'error' || error;

  if (!isActive && !isComplete && !hasError) {
    return null;
  }

  const getStepIcon = () => {
    if (hasError) return <AlertCircle className="h-5 w-5 text-destructive" />;
    if (isComplete) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  };

  const getStepColor = () => {
    if (hasError) return 'text-destructive';
    if (isComplete) return 'text-green-600';
    return 'text-blue-600';
  };

  const logs = progress.logs ?? [];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStepIcon()}
          <span className={getStepColor()}>
            {progress.step || 'Processing...'}
          </span>
          {isActive && (
            <Badge variant="secondary" className="ml-auto">
              {progress.percentage}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        {isActive && (
          <div className="space-y-2">
            <Progress value={progress.percentage} className="h-2" />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="space-y-3">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">
                Installation failed
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {error || 'An unexpected error occurred'}
              </p>
            </div>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Logs</h4>
            <div className="bg-muted/50 rounded-md p-3 max-h-32 overflow-y-auto">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="text-xs font-mono text-muted-foreground"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
