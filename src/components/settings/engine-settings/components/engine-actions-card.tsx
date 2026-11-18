import { useState } from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { OctagonX, Play, AlertTriangle } from 'lucide-react';
import {
  InstallationOperation,
  InstallationStep,
  InstallationProgress as InstallationProgressType,
  ColimaEngineStopProgressType,
  StopStep,
} from '../types';
import { InstallationProgress } from './installation-progress';
import { ConfirmDialog } from '../../../common/ConfirmDialog';
import { Dialog, DialogTrigger } from '../../../ui/dialog';

interface EngineActionsCardProps {
  isEngineRunning: boolean;
  isInstalling: boolean;
  installationOperation: InstallationOperation;
  installationStep: InstallationStep;
  installationProgress: InstallationProgressType;
  stopStep: StopStep;
  stopProgress: ColimaEngineStopProgressType;
  error: string | null;
  onRetry?: () => void;
  onStartEngine: () => void;
  onStopEngine: () => void;
}

export function EngineActionsCard({
  isEngineRunning,
  isInstalling,
  installationOperation,
  installationStep,
  installationProgress,
  stopStep,
  stopProgress,
  error,
  onRetry,
  onStartEngine,
  onStopEngine,
}: EngineActionsCardProps) {
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const isStopping = stopStep === 'stopping-vm' || stopStep === 'stopping';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Engine Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {installationStep !== 'idle' && (
          <InstallationProgress
            operation={installationOperation}
            step={installationStep}
            progress={installationProgress}
            error={error}
            onRetry={onRetry}
          />
        )}

        {stopStep !== 'idle' && (
          <InstallationProgress
            operation="stop"
            step={stopStep}
            progress={stopProgress}
            error={error}
            onRetry={onRetry}
          />
        )}

        {!isEngineRunning && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Colima is installed but the engine is not running. Start the
              engine to begin using Docker.
            </p>
            <Button
              onClick={onStartEngine}
              disabled={isInstalling || isStopping}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Engine
            </Button>
          </div>
        )}

        {isEngineRunning && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
              ✓ Engine is running and ready to use
            </p>
          </div>
        )}

        {isEngineRunning && (
          <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                size="lg"
                onClick={() => setIsStopDialogOpen(true)}
                disabled={isStopping}
              >
                <OctagonX className="h-4 w-4 mr-2" />
                {isStopping ? 'Stopping...' : 'Stop Engine'}
              </Button>
            </DialogTrigger>
            <ConfirmDialog
              title="Stop Engine"
              description={
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    This will stop the Docker engine and all running containers
                    will be stopped.
                  </div>
                  <div className="rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-3 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <div className="text-sm leading-relaxed">
                      <p>
                        Stopping the engine will halt all Docker operations and
                        containers.
                      </p>
                      <p className="mt-1">Are you sure you want to continue?</p>
                    </div>
                  </div>
                </div>
              }
              showCancel
              confirmText={isStopping ? 'Stopping...' : 'Stop Engine'}
              onConfirm={() => {
                onStopEngine();
                setIsStopDialogOpen(false);
              }}
              onCancel={() => setIsStopDialogOpen(false)}
              confirmDisabled={isStopping}
            />
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
