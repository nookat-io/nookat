import { Button } from '../../../ui/button';
import { Info, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  ColimaConfig,
  InstallationStep,
  InstallationMethod,
  InstallationProgress as InstallationProgressType,
  ColimaEngineStopProgressType,
  StopStep,
} from '../types';
import { InfoBanner } from './info-banner';
import { ColimaInstallation } from './colima-installation';
import { VmResourcesCard } from './vm-resources-card';
import { EngineActionsCard } from './engine-actions-card';
import { DockerInfo } from '../../../../types/docker-info';
import { LoadingSpinner } from '../../../ui/loading-spinner';

interface EngineConfigurationProps {
  dockerInfo: DockerInfo | null;
  colimaSupported: boolean | null;
  colimaSupportError: string | null;
  onRetrySupportCheck: () => void;
  colimaAvailable: boolean | null;
  config: ColimaConfig;
  onConfigChange: (config: ColimaConfig) => void;
  onStartEngine: () => void;
  isInstalling: boolean;
  isEngineRunning: boolean;
  installationStep: InstallationStep;
  stopStep: StopStep;
  installationProgress: InstallationProgressType;
  stopProgress: ColimaEngineStopProgressType;
  error: string | null;
  onRetry?: () => void;
  method: InstallationMethod;
  onMethodChange: (method: InstallationMethod) => void;
  homebrewAvailable: boolean | null;
  onInstall: () => void;
  onStopEngine: () => void;
}

export function EngineConfiguration({
  dockerInfo,
  colimaSupported,
  colimaSupportError,
  onRetrySupportCheck,
  colimaAvailable,
  config,
  onConfigChange,
  onStartEngine,
  isInstalling,
  isEngineRunning,
  installationStep,
  stopStep,
  installationProgress,
  stopProgress,
  error,
  onRetry,
  method,
  onMethodChange,
  homebrewAvailable,
  onInstall,
  onStopEngine,
}: EngineConfigurationProps) {
  if (colimaSupported === false) {
    return (
      <InfoBanner
        icon={Info}
        title="Engine management is available on macOS only"
        message="Nookat installs and runs the Colima engine on macOS. On this platform it connects to the Docker daemon already running on your machine - start, stop and configure that daemon with the tool you installed it with."
      />
    );
  }

  if (colimaSupportError) {
    return (
      <div className="space-y-3">
        <InfoBanner
          icon={AlertTriangle}
          title="Could not determine engine support for this platform"
          message={colimaSupportError}
          variant="error"
        />
        <Button onClick={onRetrySupportCheck} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const isEngineSetupUnknown =
    colimaSupported === null || colimaAvailable === null;
  if (isEngineSetupUnknown) {
    return (
      <LoadingSpinner message="Checking engine setup..." className="py-8" />
    );
  }

  if (!colimaAvailable) {
    return (
      <ColimaInstallation
        method={method}
        onMethodChange={onMethodChange}
        homebrewAvailable={homebrewAvailable}
        installationStep={installationStep}
        installationProgress={installationProgress}
        isInstalling={isInstalling}
        error={error}
        onRetry={onRetry}
        onInstall={onInstall}
      />
    );
  }

  return (
    <div className="space-y-6">
      <VmResourcesCard
        dockerInfo={dockerInfo}
        config={config}
        onConfigChange={onConfigChange}
        isEngineRunning={isEngineRunning}
      />
      <EngineActionsCard
        isEngineRunning={isEngineRunning}
        isInstalling={isInstalling}
        installationStep={installationStep}
        installationProgress={installationProgress}
        stopStep={stopStep}
        stopProgress={stopProgress}
        error={error}
        onRetry={onRetry}
        onStartEngine={onStartEngine}
        onStopEngine={onStopEngine}
      />
    </div>
  );
}
