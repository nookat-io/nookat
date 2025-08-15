import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Server, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import { ColimaConfig, InstallationProgress, InstallationStep } from './types';
import { ResourceInput, StatusIndicator } from './components';
import { InlineProgress } from './inline-progress';

interface EngineConfigurationProps {
  colimaAvailable: boolean | null;
  config: ColimaConfig;
  onConfigChange: (config: ColimaConfig) => void;
  onStartEngine: () => void;
  isInstalling: boolean;
  isEngineRunning: boolean;
  step?: InstallationStep;
  progress?: InstallationProgress;
  error?: string | null;
  onRetry?: () => void;
}

const VMResourceConfig = ({
  config,
  onConfigChange,
}: {
  config: ColimaConfig;
  onConfigChange: (config: ColimaConfig) => void;
}) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">VM Resources</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ResourceInput
        id="cpu"
        label="CPU Cores"
        value={config.cpu}
        min={1}
        max={16}
        onChange={value => onConfigChange({ ...config, cpu: value })}
        icon={Cpu}
        unit="cores"
      />

      <ResourceInput
        id="memory"
        label="Memory (GB)"
        value={config.memory}
        min={2}
        max={32}
        onChange={value => onConfigChange({ ...config, memory: value })}
        icon={MemoryStick}
        unit="GB"
      />

      <ResourceInput
        id="disk"
        label="Disk (GB)"
        value={config.disk}
        min={20}
        max={200}
        onChange={value => onConfigChange({ ...config, disk: value })}
        icon={HardDrive}
        unit="GB"
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
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          <Server className="h-3 w-3 inline mr-1" />
          {config.architecture}
        </div>
      </div>
    </div>
  </div>
);

const EngineActions = ({
  onStartEngine,
  isInstalling,
  isEngineRunning,
  step,
  progress,
}: {
  onStartEngine: () => void;
  isInstalling: boolean;
  isEngineRunning: boolean;
  step?: InstallationStep;
  progress?: InstallationProgress;
  error?: string | null;
}) => (
  <div className="space-y-4">
    <div className="flex justify-end pt-4 border-t">
      <Button
        onClick={onStartEngine}
        disabled={isInstalling || isEngineRunning}
        size="lg"
        className="px-8"
        variant={isEngineRunning ? 'secondary' : 'default'}
      >
        <Server className="h-4 w-4 mr-2" />
        {isEngineRunning ? 'Engine Running' : 'Start Engine'}
      </Button>
    </div>

    {/* Show progress logs only when process has started (not idle) and there's progress data */}
    {step && step !== 'idle' && progress && progress.logs.length > 0 && (
      <InlineProgress step={step} progress={progress} />
    )}
  </div>
);

export const EngineConfiguration = ({
  colimaAvailable,
  config,
  onConfigChange,
  onStartEngine,
  isInstalling,
  isEngineRunning,
  step,
  progress,
  error,
}: EngineConfigurationProps) => {
  const getStatusInfo = () => {
    if (colimaAvailable === null) {
      return {
        status: 'loading' as const,
        title: 'Checking status...',
        description: 'Verifying system configuration',
      };
    }

    if (colimaAvailable) {
      return {
        status: 'available' as const,
        title: 'Colima Available',
        description: 'Ready to start engine',
      };
    }

    return {
      status: 'unavailable' as const,
      title: 'Colima Not Installed',
      description: 'Installation required',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      <StatusIndicator {...statusInfo} />

      {colimaAvailable && (
        <>
          <VMResourceConfig config={config} onConfigChange={onConfigChange} />
          <EngineActions
            onStartEngine={onStartEngine}
            isInstalling={isInstalling}
            isEngineRunning={isEngineRunning}
            step={step}
            progress={progress}
            error={error}
          />
        </>
      )}
    </div>
  );
};
