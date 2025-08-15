import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Label } from '../../ui/label';
import { Loader2 } from 'lucide-react';
import { InstallationProgress, InstallationStep } from './types';

interface InstallationProgressSectionProps {
  step: InstallationStep;
  progress: InstallationProgress;
}

export const InstallationProgressSection = ({
  step,
  progress,
}: InstallationProgressSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {step === 'installing' ? 'Installing Colima' : 'Starting Engine'}
        </CardTitle>
        <CardDescription>{progress.step}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{progress.message}</span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-600 dark:bg-blue-400 transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Progress Logs</Label>
          <div className="h-48 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-y-auto font-mono text-xs">
            {progress.logs.map((log, index) => (
              <div key={index} className="text-gray-700 dark:text-gray-300">
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          This process may take several minutes. Please don't close the
          application.
        </div>
      </CardContent>
    </Card>
  );
};
