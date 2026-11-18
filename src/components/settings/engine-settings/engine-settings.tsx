import { useEngineStatus } from '../../../hooks/use-engine-status';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Activity } from 'lucide-react';
import { useEngineSettingsState } from './hooks';
import { CollapsibleSection } from './collapsible-section';
import { EngineStatusSection } from './engine-status-section';
import { EngineConfiguration } from './components';
import { LoadingSpinner } from '../../ui/loading-spinner';

export function EngineSettings() {
  const { isChecking } = useEngineStatus();
  const [state, actions] = useEngineSettingsState();

  const isEngineRunning = state.colimaVm?.profile.status === 'Running';
  const isInstalling =
    state.installationStep === 'installing' ||
    state.installationStep === 'starting-vm' ||
    state.installationStep === 'validating';

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
            Current engine information and status overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EngineStatusSection dockerInfo={state.dockerInfo} />
        </CardContent>
      </Card>

      <CollapsibleSection
        title="Engine Configuration"
        isOpen={state.showEngineConfig}
        onToggle={() => actions.setShowEngineConfig(!state.showEngineConfig)}
      >
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
          onInstall={actions.handleInstall}
          onStopEngine={actions.handleStopEngine}
        />
      </CollapsibleSection>
    </div>
  );
}
