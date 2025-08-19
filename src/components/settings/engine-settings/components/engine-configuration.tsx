import { Label } from '../../../ui/label';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import {
  Play,
  Settings,
  Download,
  Package,
  Terminal,
  Info,
} from 'lucide-react';
import {
  ColimaConfig,
  InstallationStep,
  InstallationMethod,
  InstallationProgress as InstallationProgressType,
} from '../types';
import { ResourceInput } from './resource-input';
import { InstallationProgress } from './installation-progress';
import { MethodCard, InfoBanner } from './index';

interface EngineConfigurationProps {
  colimaAvailable: boolean | null;
  config: ColimaConfig;
  onConfigChange: (config: ColimaConfig) => void;
  onStartEngine: () => void;
  isInstalling: boolean;
  isEngineRunning: boolean;
  step: InstallationStep;
  progress: InstallationProgressType;
  error: string | null;
  onRetry?: () => void;
  // Installation props
  method: InstallationMethod;
  onMethodChange: (method: InstallationMethod) => void;
  homebrewAvailable: boolean | null;
  onInstall: () => void;
}

export function EngineConfiguration({
  colimaAvailable,
  config,
  onConfigChange,
  onStartEngine,
  isInstalling,
  isEngineRunning,
  step,
  progress,
  error,
  onRetry,
  method,
  onMethodChange,
  homebrewAvailable,
  onInstall,
}: EngineConfigurationProps) {
  const showProgress = step !== 'idle';

  // Show installation section if Colima is not available
  if (colimaAvailable === false) {
    return (
      <div className="space-y-6">
        {/* Installation Methods */}
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

        {/* Installation Info */}
        <InfoBanner
          icon={Info}
          title="What will be installed"
          message="- Colima - Lightweight Docker-compatible runtime and its dependencies"
          variant="info"
        />

        {/* Installation Progress */}
        {showProgress && (
          <InstallationProgress
            step={step}
            progress={progress}
            error={error}
            onRetry={onRetry}
          />
        )}

        {/* Install Button */}
        <Button
          onClick={onInstall}
          className="w-full"
          size="lg"
          disabled={
            isInstalling ||
            (homebrewAvailable === false && method === 'homebrew') ||
            method === 'binary'
          }
        >
          <Download className="h-4 w-4 mr-2" />
          {isInstalling ? 'Installing...' : 'Install Colima'}
        </Button>
      </div>
    );
  }

  // Show engine configuration if Colima is available
  return (
    <div className="space-y-6">
      {/* VM Resource Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            VM Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ResourceInput
              id="cpu"
              label="CPU Cores"
              value={config.cpu}
              min={1}
              max={16}
              onChange={value => onConfigChange({ ...config, cpu: value })}
            />

            <ResourceInput
              id="memory"
              label="Memory (GB)"
              value={config.memory}
              min={2}
              max={32}
              onChange={value => onConfigChange({ ...config, memory: value })}
            />

            <ResourceInput
              id="disk"
              label="Disk (GB)"
              value={config.disk}
              min={20}
              max={200}
              onChange={value => onConfigChange({ ...config, disk: value })}
            />

            <div className="space-y-2">
              <Label htmlFor="architecture">Architecture</Label>
              <Select
                value={config.architecture}
                onValueChange={value =>
                  onConfigChange({ ...config, architecture: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x86_64">x86_64</SelectItem>
                  <SelectItem value="aarch64">ARM64</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engine Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Engine Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Installation Progress */}
          {showProgress && (
            <InstallationProgress
              step={step}
              progress={progress}
              error={error}
              onRetry={onRetry}
            />
          )}

          {colimaAvailable === true && !isEngineRunning && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Colima is installed but the engine is not running. Start the
                engine to begin using Docker.
              </p>
              <Button
                onClick={onStartEngine}
                disabled={isInstalling}
                className="w-full"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Engine
              </Button>
            </div>
          )}

          {isEngineRunning && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium">
                ✓ Engine is running and ready to use
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
