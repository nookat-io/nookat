import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Settings, Download, Package, Terminal, Info } from 'lucide-react';
import {
  BinaryInstallPlan,
  InstallationOperation,
  InstallationStep,
  InstallationMethod,
  InstallationProgress as InstallationProgressType,
} from '../types';
import { InstallationProgress } from './installation-progress';
import { MethodCard } from './method-card';
import { InfoBanner } from './info-banner';

const BYTES_PER_MB = 1_000_000;

interface ColimaInstallationProps {
  method: InstallationMethod;
  onMethodChange: (method: InstallationMethod) => void;
  homebrewAvailable: boolean | null;
  binaryInstallPlan: BinaryInstallPlan | null;
  binaryInstallPlanError: string | null;
  installationOperation: InstallationOperation;
  installationStep: InstallationStep;
  installationProgress: InstallationProgressType;
  isInstalling: boolean;
  error: string | null;
  onRetry?: () => void;
  onInstall: () => void;
}

function componentList(plan: BinaryInstallPlan) {
  const names = plan.components.map(
    component => `${component.name} ${component.version}`
  );
  const last = names.pop();
  return names.length > 0 ? `${names.join(', ')} and ${last}` : (last ?? '');
}

function megabytes(bytes: number) {
  return Math.ceil(bytes / BYTES_PER_MB);
}

function binaryDetails(plan: BinaryInstallPlan | null) {
  if (!plan) {
    return 'Downloads Colima, Lima and the Docker CLI from their official releases. No Homebrew needed.';
  }
  return `Downloads ${componentList(plan)} from their official releases and checks each SHA-256 digest. No Homebrew needed.`;
}

function whatWillBeInstalled(
  method: InstallationMethod,
  plan: BinaryInstallPlan | null
) {
  if (method === 'homebrew') {
    return 'Colima, Lima and the Docker CLI from Homebrew. Update them later with brew upgrade.';
  }
  if (!plan) {
    return 'Colima, Lima and the Docker CLI into a folder that Nookat owns in your home directory.';
  }
  return `${componentList(plan)} into ${plan.install_dir}. Downloads ${megabytes(plan.download_bytes)} MB and takes ${megabytes(plan.installed_bytes)} MB of disk space. Nookat runs them from there; to use them in a terminal too, add ${plan.bin_dir} to your PATH.`;
}

export function ColimaInstallation({
  method,
  onMethodChange,
  homebrewAvailable,
  binaryInstallPlan,
  binaryInstallPlanError,
  installationOperation,
  installationStep,
  installationProgress,
  isInstalling,
  error,
  onRetry,
  onInstall,
}: ColimaInstallationProps) {
  const methodIsReady =
    method === 'homebrew'
      ? homebrewAvailable !== false
      : binaryInstallPlan !== null;
  const canInstall = !isInstalling && methodIsReady;

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
              details={binaryDetails(binaryInstallPlan)}
              isSelected={method === 'binary'}
              isDisabled={binaryInstallPlanError !== null}
              isChecking={
                binaryInstallPlan === null && binaryInstallPlanError === null
              }
              warning={binaryInstallPlanError ?? undefined}
              onClick={() => onMethodChange('binary')}
            />
          </div>
        </CardContent>
      </Card>

      <InfoBanner
        icon={Info}
        title="What will be installed"
        message={whatWillBeInstalled(method, binaryInstallPlan)}
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
