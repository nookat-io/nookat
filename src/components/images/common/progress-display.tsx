import { CheckCircle, AlertCircle } from 'lucide-react';
import { ProgressState } from './types';

interface ProgressDisplayProps {
  progress: ProgressState;
}

export function ProgressDisplay({ progress }: ProgressDisplayProps) {
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
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{progress.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 rounded-lg border">
      <div className="flex items-center space-x-2">
        {progress.isRunning && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        )}
        {progress.success && <CheckCircle className="h-4 w-4 text-green-500" />}
        <span>{progress.progress}</span>
      </div>
    </div>
  );
}
