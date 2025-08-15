import { Button } from '../../ui/button';
import { Download, Package, Terminal, Info } from 'lucide-react';
import { InstallationMethod } from './types';
import { MethodCard, InfoBanner } from './components';

interface InstallationSectionProps {
  method: InstallationMethod;
  onMethodChange: (method: InstallationMethod) => void;
  homebrewAvailable: boolean | null;
  onInstall: () => void;
}

const InstallationMethods = ({
  method,
  onMethodChange,
  homebrewAvailable,
}: {
  method: InstallationMethod;
  onMethodChange: (method: InstallationMethod) => void;
  homebrewAvailable: boolean | null;
}) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Installation Method</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MethodCard
        icon={Package}
        title="Install via Homebrew"
        description="Recommended for most users"
        details="Uses Homebrew package manager for easy installation and updates"
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
        details="Download and install binaries directly (requires sudo)"
        isSelected={method === 'binary'}
        onClick={() => onMethodChange('binary')}
      />
    </div>
  </div>
);

const InstallationInfo = () => (
  <InfoBanner
    icon={Info}
    title="What will be installed"
    message="- Colima - Lightweight Docker-compatible runtime and its dependencies"
    variant="info"
  />
);

export const InstallationSection = ({
  method,
  onMethodChange,
  homebrewAvailable,
  onInstall,
}: InstallationSectionProps) => {
  return (
    <div className="space-y-6">
      <InstallationMethods
        method={method}
        onMethodChange={onMethodChange}
        homebrewAvailable={homebrewAvailable}
      />

      <InstallationInfo />

      <Button
        onClick={onInstall}
        className="w-full"
        size="lg"
        disabled={homebrewAvailable === false && method === 'homebrew'}
      >
        <Download className="h-4 w-4 mr-2" />
        Install Colima
      </Button>
    </div>
  );
};
