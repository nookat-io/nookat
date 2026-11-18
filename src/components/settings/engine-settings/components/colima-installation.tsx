import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Settings, Download, Package, Terminal, Info } from 'lucide-react';
import {
  InstallationOperation,
  InstallationStep,
  InstallationMethod,
  InstallationProgress as InstallationProgressType,
} from '../types';
import { InstallationProgress } from './installation-progress';
import { MethodCard } from './method-card';
import { InfoBanner } from './info-banner';

interface ColimaInstallationProps {
  method: InstallationMethod;
  onMethodChange: (method: InstallationMethod) => void;
  homebrewAvailable: boolean | null;
  installationOperation: InstallationOperation;
  installationStep: InstallationStep;
  installationProgress: InstallationProgressType;
  isInstalling: boolean;
  error: string | null;
  onRetry?: () => void;
  onInstall: () => void;
}

export function ColimaInstallation({
  method,
  onMethodChange,
  homebrewAvailable,
  installationOperation,
  installationStep,
  installationProgress,
  isInstalling,
  error,
  onRetry,
  onInstall,
}: ColimaInstallationProps) {
  const canInstall =
    !isInstalling && method === 'homebrew' && homebrewAvailable !== false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Install Colima
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MethodCard
              icon={Package}
              title="Install via Homebrew"
              description="Recommended for most users"
              details="Uses Homebrew package manager for installation and updates"
              isSelected={method === 'homebrew'}
              isDisabled={homebrewAvailable === false}
              isChecking={homebrewAvailable === null}
              warning={
                homebrewAvailable === false
                  ? 'Install Homebrew first or use Binary installation method'
                  : undefined
              }
              onClick={() => onMethodChange('homebrew')}
            />

            <MethodCard
              icon={Terminal}
              title="Binary Installation"
              description="Direct download and install"
              details="Download and install binaries directly. Not available yet."
              isSelected={method === 'binary'}
              onClick={() => onMethodChange('binary')}
              isDisabled={true}
            />
          </div>
        </CardContent>
      </Card>

      <InfoBanner
        icon={Info}
        title="What will be installed"
        message="- Colima - Lightweight Docker-compatible runtime and its dependencies"
        variant="info"
      />

      {installationStep !== 'idle' && (
        <InstallationProgress
          operation={installationOperation}
          step={installationStep}
          progress={installationProgress}
          error={error}
          onRetry={onRetry}
        />
      )}

      <Button
        onClick={onInstall}
        className="w-full"
        size="lg"
        disabled={!canInstall}
      >
        <Download className="h-4 w-4 mr-2" />
        {isInstalling ? 'Installing...' : 'Install Colima'}
      </Button>
    </div>
  );
}
