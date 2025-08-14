import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Copy, Check } from 'lucide-react';

interface InstallationProgress {
  step: string;
  message: string;
  percentage: number;
  logs: string[];
}

interface InstallationProgressProps {
  progress: InstallationProgress | null;
  logs: string[];
  isInstalling?: boolean;
  isStartingVm?: boolean;
  onCopyLogs?: () => void;
}

export function InstallationProgress({
  progress,
  logs,
  isInstalling = false,
  isStartingVm = false,
  onCopyLogs,
}: InstallationProgressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLogs = async () => {
    if (logs.length > 0) {
      try {
        await navigator.clipboard.writeText(logs.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onCopyLogs?.();
      } catch (err) {
        console.error('Failed to copy logs:', err);
      }
    }
  };

  if (!progress && !isInstalling && !isStartingVm) {
    return null;
  }

  const getTitle = () => {
    if (isInstalling) return 'Installing Colima';
    if (isStartingVm) return 'Starting VM';
    return progress?.step || 'Progress';
  };

  const getDescription = () => {
    if (isInstalling)
      return 'Installing Colima, Docker CLI, and Docker Compose...';
    if (isStartingVm)
      return 'Starting Colima VM with specified configuration...';
    return progress?.message || '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        {getDescription() && (
          <CardDescription>{getDescription()}</CardDescription>
        )}
        {progress && (
          <div className="flex items-center gap-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground min-w-[3rem]">
              {progress.percentage}%
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Installation Logs</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLogs}
                className="h-8 px-2"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-md max-h-64 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="text-xs">
                  {log}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {logs.length} log entries
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
