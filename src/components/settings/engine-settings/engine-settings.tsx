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

  // Computed values
  const isEngineRunning = Boolean(state.dockerInfo?.server_version);
  const isInstalling =
    state.step === 'installing' ||
    state.step === 'starting-vm' ||
    state.step === 'validating';

  // Show loading state while checking engine status
  if (isChecking) {
    return (
      <LoadingSpinner message="Checking engine status..." className="py-8" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Engine Status Card */}
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

      {/* Engine Configuration & Installation */}
      <CollapsibleSection
        title="Engine Configuration"
        isOpen={state.showEngineConfig}
        onToggle={() => actions.setShowEngineConfig(!state.showEngineConfig)}
      >
        <EngineConfiguration
          colimaAvailable={state.colimaAvailable}
          config={state.config}
          onConfigChange={actions.setConfig}
          onStartEngine={actions.handleStartEngine}
          isInstalling={isInstalling}
          isEngineRunning={isEngineRunning}
          step={state.step}
          progress={state.progress}
          error={state.error}
          onRetry={actions.handleRetry}
          method={state.method}
          onMethodChange={actions.setMethod}
          homebrewAvailable={state.homebrewAvailable}
          onInstall={actions.handleInstall}
        />
      </CollapsibleSection>
    </div>
  );
}
