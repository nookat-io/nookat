import { useEngineStatus } from '../../../hooks/use-engine-status';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Activity, Layers } from 'lucide-react';
import { useEngineSettingsState } from './hooks';
import { CollapsibleSection } from './collapsible-section';
import { EngineStatusSection } from './engine-status-section';
import { EngineConfiguration, InfoBanner } from './components';
import { LoadingSpinner } from '../../ui/loading-spinner';
import { ConnectedEngine } from './types';

function ConnectionDescription({
  engine,
}: {
  engine: ConnectedEngine | null | undefined;
}) {
  if (engine === undefined) {
    return <>Checking which engine Nookat is connected to</>;
  }
  if (engine === null) {
    return <>Nookat is not connected to an engine</>;
  }
  return (
    <>
      Nookat is connected to{' '}
      <span className="font-medium text-foreground">{engine.name}</span> at{' '}
      <code className="break-all font-mono text-xs">{engine.endpoint}</code>
    </>
  );
}

export function EngineSettings() {
  const { isChecking } = useEngineStatus();
  const [state, actions] = useEngineSettingsState();

  const isEngineRunning = state.colimaVm?.profile.status === 'Running';
  const isInstalling =
    state.installationStep === 'installing' ||
    state.installationStep === 'starting-vm' ||
    state.installationStep === 'validating';

  const { connectedEngine } = state;
  const isColimaSupportKnown =
    state.colimaSupported !== null || state.colimaSupportError !== null;
  const otherEngine =
    state.colimaSupported === true &&
    connectedEngine &&
    !connectedEngine.is_managed_colima
      ? connectedEngine
      : null;
  const isEngineConfigOpen = state.showEngineConfig ?? !otherEngine;

  if (isChecking) {
    return (
      <LoadingSpinner message="Checking engine status..." className="py-8" />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Engine Status
          </CardTitle>
          <CardDescription>
            <ConnectionDescription engine={connectedEngine} />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EngineStatusSection dockerInfo={state.dockerInfo} />
        </CardContent>
      </Card>

      {connectedEngine !== undefined && isColimaSupportKnown && (
        <CollapsibleSection
          title={
            otherEngine
              ? `Use Colima instead of ${otherEngine.name}`
              : 'Engine Configuration'
          }
          isOpen={isEngineConfigOpen}
          onToggle={() => actions.setShowEngineConfig(!isEngineConfigOpen)}
        >
          {otherEngine && (
            <InfoBanner
              icon={Layers}
              title="Colima is a second engine"
              message={`Nookat uses ${otherEngine.name}. Colima runs its own Linux VM next to it, with its own CPU, memory and disk.`}
              className="mb-6"
            />
          )}
          <EngineConfiguration
            colimaSupported={state.colimaSupported}
            colimaSupportError={state.colimaSupportError}
            onRetrySupportCheck={actions.checkColimaSupport}
            colimaAvailable={state.colimaAvailable}
            colimaVm={state.colimaVm}
            colimaVmError={state.colimaVmError}
            onRetryColimaVm={actions.fetchColimaVm}
            changes={state.changes}
            onChangeSetting={actions.changeSetting}
            onStartEngine={actions.handleStartEngine}
            isInstalling={isInstalling}
            isEngineRunning={isEngineRunning}
            installationOperation={state.installationOperation}
            installationStep={state.installationStep}
            stopStep={state.stopStep}
            installationProgress={state.installationProgress}
            stopProgress={state.stopProgress}
            error={state.error}
            onRetry={actions.handleRetry}
            method={state.method}
            onMethodChange={actions.setMethod}
            homebrewAvailable={state.homebrewAvailable}
            binaryInstallPlan={state.binaryInstallPlan}
            binaryInstallPlanError={state.binaryInstallPlanError}
            onInstall={actions.handleInstall}
            onStopEngine={actions.handleStopEngine}
            startPromptOpen={state.startPromptOpen}
            onStartFromPrompt={actions.startEngineFromPrompt}
            onDismissStartPrompt={actions.dismissStartPrompt}
            isSwitchingDockerContext={state.isSwitchingDockerContext}
            dockerContextError={state.dockerContextError}
            onSwitchDockerToColima={actions.switchDockerToColima}
            otherEngineName={otherEngine?.name ?? null}
          />
        </CollapsibleSection>
      )}
    </div>
  );
}
