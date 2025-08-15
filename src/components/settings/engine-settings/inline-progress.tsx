import { Label } from '../../ui/label';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { InstallationProgress, InstallationStep } from './types';

interface InlineProgressProps {
  step: InstallationStep;
  progress: InstallationProgress;
}

export const InlineProgress = ({ step, progress }: InlineProgressProps) => {
  const getStepInfo = () => {
    switch (step) {
      case 'installing':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          title: 'Installing Colima',
          bgColor: 'bg-gray-50 dark:bg-gray-900',
          borderColor: 'border-gray-200 dark:border-gray-700',
        };
      case 'starting-vm':
      case 'validating':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          title: 'Starting Engine',
          bgColor: 'bg-gray-50 dark:bg-gray-900',
          borderColor: 'border-gray-200 dark:border-gray-700',
        };
      case 'complete':
        return {
          icon: (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          ),
          title: 'Installation Complete',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
        };
      case 'error':
        return {
          icon: (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          ),
          title: 'Installation Failed',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
        };
      default:
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          title: 'Processing',
          bgColor: 'bg-gray-50 dark:bg-gray-900',
          borderColor: 'border-gray-200 dark:border-gray-700',
        };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <div
      className={`mt-4 p-4 ${stepInfo.bgColor} rounded-lg border ${stepInfo.borderColor}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {stepInfo.icon}
        <span className="text-sm font-medium">{stepInfo.title}</span>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{progress.message}</span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-1.5 transition-all duration-300 ease-out ${
                step === 'complete'
                  ? 'bg-green-600 dark:bg-green-400'
                  : step === 'error'
                    ? 'bg-red-600 dark:bg-red-400'
                    : 'bg-blue-600 dark:bg-blue-400'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">Progress Logs</Label>
          <div className="h-32 bg-white dark:bg-gray-800 rounded border p-2 overflow-y-auto font-mono text-xs">
            {progress.logs.map((log, index) => (
              <div key={index} className="text-gray-700 dark:text-gray-300">
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {step === 'complete'
            ? 'Installation completed successfully. You can now use the engine.'
            : step === 'error'
              ? 'Installation failed. Check the logs above for details.'
              : "This process may take several minutes. Please don't close the application."}
        </div>
      </div>
    </div>
  );
};
