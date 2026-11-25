import { useEngineStatus } from '../../../hooks/use-engine-status';
import { useEngineState } from '../../../hooks/use-engine-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Activity, Layers, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { useEngineSettingsState } from './hooks';
import { CollapsibleSection } from './collapsible-section';
import { EngineStatusSection } from './engine-status-section';
import { EngineConfiguration, InfoBanner } from './components';
import { LoadingSpinner } from '../../ui/loading-spinner';
import { EngineConnection } from './types';

function ConnectionDescription({
  connection,
  onRetry,
}: {
  connection: EngineConnection;
  onRetry: () => void;
}) {
  switch (connection.kind) {
    case 'checking':
      return (
        <CardDescription>
          Checking which engine Nookat is connected to
        </CardDescription>
      );
    case 'disconnected':
      return (
        <CardDescription>Nookat is not connected to an engine</CardDescription>
      );
    case 'unidentified':
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <CardDescription className="break-words">
            Nookat could not tell which engine it is connected to:{' '}
            {connection.error}
          </CardDescription>
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    case 'connected':
      return (
        <CardDescription>
          Nookat is connected to{' '}
          <span className="font-medium text-foreground">
            {connection.engine.name}
          </span>{' '}
          at{' '}
          <code className="break-all font-mono text-xs">
            {connection.engine.endpoint}
          </code>
        </CardDescription>
      );
  }
}

export function EngineSettings() {
  const { isChecking } = useEngineStatus();
  const { engineState } = useEngineState();
  const [state, actions] = useEngineSettingsState();

  const isEngineRunning = state.colimaVm?.profile.status === 'Running';
  const isInstalling =
    state.installationStep === 'installing' ||
    state.installationStep === 'starting-vm' ||
    state.installationStep === 'validating';

  const { engineConnection } = state;
  const isColimaSupportKnown =
    state.colimaSupported !== null || state.colimaSupportError !== null;
  const otherEngine =
    state.colimaSupported === true &&
    engineConnection.kind === 'connected' &&
    !engineConnection.engine.is_managed_colima
      ? engineConnection.engine
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
          <ConnectionDescription
            connection={engineConnection}
            onRetry={actions.fetchEngineDetails}
          />
        </CardHeader>
        <CardContent>
          <EngineStatusSection
            dockerInfo={state.dockerInfo}
            engineState={engineState}
          />
        </CardContent>
      </Card>

      {engineConnection.kind !== 'checking' && isColimaSupportKnown && (
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
            otherEngine={otherEngine}
          />
        </CollapsibleSection>
      )}
    </div>
  );
}
