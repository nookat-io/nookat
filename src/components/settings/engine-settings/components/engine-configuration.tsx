import { Button } from '../../../ui/button';
import { Info, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  BinaryInstallPlan,
  ChangeColimaVmSetting,
  ColimaVm,
  ColimaVmSettingsChanges,
  InstallationOperation,
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
import { StartEnginePrompt } from './start-engine-prompt';
import { LoadingSpinner } from '../../../ui/loading-spinner';

interface EngineConfigurationProps {
  colimaSupported: boolean | null;
  colimaSupportError: string | null;
  onRetrySupportCheck: () => void;
  colimaAvailable: boolean | null;
  colimaVm: ColimaVm | null;
  colimaVmError: string | null;
  onRetryColimaVm: () => void;
  changes: ColimaVmSettingsChanges;
  onChangeSetting: ChangeColimaVmSetting;
  onStartEngine: () => void;
  isInstalling: boolean;
  isEngineRunning: boolean;
  installationOperation: InstallationOperation;
  installationStep: InstallationStep;
  stopStep: StopStep;
  installationProgress: InstallationProgressType;
  stopProgress: ColimaEngineStopProgressType;
  error: string | null;
  onRetry?: () => void;
  method: InstallationMethod;
  onMethodChange: (method: InstallationMethod) => void;
  homebrewAvailable: boolean | null;
  binaryInstallPlan: BinaryInstallPlan | null;
  binaryInstallPlanError: string | null;
  onInstall: () => void;
  onStopEngine: () => void;
  startPromptOpen: boolean;
  onStartFromPrompt: () => void;
  onDismissStartPrompt: () => void;
  isSwitchingDockerContext: boolean;
  dockerContextError: string | null;
  onSwitchDockerToColima: () => void;
  otherEngineName: string | null;
}

export function EngineConfiguration({
  colimaSupported,
  colimaSupportError,
  onRetrySupportCheck,
  colimaAvailable,
  colimaVm,
  colimaVmError,
  onRetryColimaVm,
  changes,
  onChangeSetting,
  onStartEngine,
  isInstalling,
  isEngineRunning,
  installationOperation,
  installationStep,
  stopStep,
  installationProgress,
  stopProgress,
  error,
  onRetry,
  method,
  onMethodChange,
  homebrewAvailable,
  binaryInstallPlan,
  binaryInstallPlanError,
  onInstall,
  onStopEngine,
  startPromptOpen,
  onStartFromPrompt,
  onDismissStartPrompt,
  isSwitchingDockerContext,
  dockerContextError,
  onSwitchDockerToColima,
  otherEngineName,
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
        binaryInstallPlan={binaryInstallPlan}
        binaryInstallPlanError={binaryInstallPlanError}
        installationOperation={installationOperation}
        installationStep={installationStep}
        installationProgress={installationProgress}
        isInstalling={isInstalling}
        error={error}
        onRetry={onRetry}
        onInstall={onInstall}
      />
    );
  }

  if (colimaVmError) {
    return (
      <div className="space-y-3">
        <InfoBanner
          icon={AlertTriangle}
          title="Could not read the Colima profile"
          message={colimaVmError}
          variant="error"
        />
        <Button onClick={onRetryColimaVm} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!colimaVm) {
    return (
      <LoadingSpinner
        message="Reading the Colima profile..."
        className="py-8"
      />
    );
  }

  const isStopping = stopStep === 'stopping-vm';

  return (
    <div className="space-y-6">
      <VmResourcesCard
        vm={colimaVm}
        changes={changes}
        onChangeSetting={onChangeSetting}
        isEngineRunning={isEngineRunning}
        isBusy={isInstalling || isStopping}
      />
      <EngineActionsCard
        isEngineRunning={isEngineRunning}
        isInstalling={isInstalling}
        installationOperation={installationOperation}
        installationStep={installationStep}
        installationProgress={installationProgress}
        stopStep={stopStep}
        stopProgress={stopProgress}
        error={error}
        onRetry={onRetry}
        onStartEngine={onStartEngine}
        onStopEngine={onStopEngine}
        dockerContext={colimaVm.docker_context}
        isSwitchingDockerContext={isSwitchingDockerContext}
        dockerContextError={dockerContextError}
        onSwitchDockerToColima={onSwitchDockerToColima}
        otherEngineName={otherEngineName}
      />
      <StartEnginePrompt
        open={startPromptOpen && !isEngineRunning}
        otherEngineName={otherEngineName}
        onStart={onStartFromPrompt}
        onDismiss={onDismissStartPrompt}
      />
    </div>
  );
}
