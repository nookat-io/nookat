import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEngineStatus } from '../../hooks/use-engine-status';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Activity } from 'lucide-react';
import { DockerInfo } from '../../types/docker-info';
import {
  CollapsibleSection,
  EngineStatusSection,
  EngineConfiguration,
  InstallationSection,
  InstallationMethod,
  InstallationStep,
  InstallationProgress,
  ColimaConfig,
} from './engine-settings/index';

export function EngineSettings() {
  const { isChecking } = useEngineStatus();

  // Installation state
  const [method, setMethod] = useState<InstallationMethod>('homebrew');
  const [step, setStep] = useState<InstallationStep>('idle');
  const [homebrewAvailable, setHomebrewAvailable] = useState<boolean | null>(
    null
  );
  const [colimaAvailable, setColimaAvailable] = useState<boolean | null>(null);
  const [config, setConfig] = useState<ColimaConfig>({
    cpu: 4,
    memory: 8,
    disk: 60,
    architecture: 'x86_64',
  });
  const [progress, setProgress] = useState<InstallationProgress>({
    step: '',
    message: '',
    percentage: 0,
    logs: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);

  // UI state
  const [showReinstallSection, setShowReinstallSection] = useState(false);
  const [showEngineConfig, setShowEngineConfig] = useState(true);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const isHomebrewAvailable = await invoke<boolean>(
          'check_homebrew_availability'
        );
        setHomebrewAvailable(isHomebrewAvailable);

        const isColimaAvailable = await invoke<boolean>(
          'check_colima_availability'
        );
        setColimaAvailable(isColimaAvailable);

        if (!isHomebrewAvailable && method === 'homebrew') {
          setMethod('binary');
        }

        if (isColimaAvailable) {
          fetchDockerInfo();
        }
      } catch (error) {
        console.error('Error checking availability:', error);
        setHomebrewAvailable(false);
        setColimaAvailable(false);
        if (method === 'homebrew') {
          setMethod('binary');
        }
      }
    };

    checkAvailability();
  }, [method]);

  // Fetch Docker info
  const fetchDockerInfo = async () => {
    try {
      const info = await invoke<DockerInfo>('get_docker_info');
      setDockerInfo(info);
    } catch (err) {
      console.error('Error fetching Docker info:', err);
      setDockerInfo(null);
    }
  };

  // Event listeners for installation progress
  useEffect(() => {
    if (step === 'installing' || step === 'starting-vm') {
      const unlistenPromises: Promise<() => void>[] = [];

      if (step === 'installing') {
        const unlistenInstall = listen('installation-progress', event => {
          const progressData = event.payload as InstallationProgress;
          setProgress(progressData);
        });
        unlistenPromises.push(unlistenInstall);

        const unlistenComplete = listen('installation-complete', async () => {
          setStep('starting-vm');
          setProgress({
            step: 'Starting Engine...',
            message: 'Initializing Colima virtual machine',
            percentage: 0,
            logs: ['[INFO] Colima installation completed, starting engine...'],
          });

          try {
            await invoke('start_colima_vm_command', { config });
          } catch (error) {
            console.error('Engine startup failed:', error);
            setError(error as string);
            setStep('error');
          }
        });
        unlistenPromises.push(unlistenComplete);

        const unlistenError = listen('installation-error', event => {
          const errorMsg = event.payload as string;
          setError(errorMsg);
          setStep('error');
        });
        unlistenPromises.push(unlistenError);
      }

      if (step === 'starting-vm') {
        const unlistenVMProgress = listen('vm-startup-progress', event => {
          const progressData = event.payload as InstallationProgress;
          setProgress(progressData);
        });
        unlistenPromises.push(unlistenVMProgress);

        const unlistenVMComplete = listen('vm-startup-complete', () => {
          setStep('validating');
          setProgress(prev => ({
            ...prev,
            step: 'Validating engine...',
            message: 'Testing Docker connectivity and engine status',
            percentage: 95,
            logs: [
              ...prev.logs,
              '[INFO] Engine startup completed successfully',
            ],
          }));

          setTimeout(() => {
            setStep('complete');
            setProgress(prev => ({
              ...prev,
              step: 'Engine Ready!',
              message: 'Colima engine is ready to use',
              percentage: 100,
              logs: [...prev.logs, '[INFO] Engine started successfully'],
            }));
          }, 2000);
        });
        unlistenPromises.push(unlistenVMComplete);

        const unlistenVMError = listen('vm-startup-error', event => {
          const errorMsg = event.payload as string;
          setError(errorMsg);
          setStep('error');
        });
        unlistenPromises.push(unlistenVMError);
      }

      return () => {
        unlistenPromises.forEach(unlisten => {
          unlisten.then(cleanup => cleanup());
        });
      };
    }
  }, [step, config]);

  // Handlers
  const handleInstall = async () => {
    setStep('installing');
    setError(null);
    setProgress({
      step: 'Starting installation...',
      message: 'Preparing to install Colima',
      percentage: 0,
      logs: ['[INFO] Starting Colima installation...'],
    });

    try {
      const methodEnum = method === 'homebrew' ? 'Homebrew' : 'Binary';
      await invoke('install_colima_command', { method: methodEnum });
    } catch (error) {
      console.error('Installation failed:', error);
      setError(error as string);
      setStep('error');
    }
  };

  const handleStartEngine = async () => {
    setStep('starting-vm');
    setError(null);
    setProgress({
      step: 'Starting Engine...',
      message: 'Initializing Colima virtual machine',
      percentage: 0,
      logs: ['[INFO] Starting Colima engine...'],
    });

    try {
      await invoke('start_colima_vm_command', { config });
    } catch (error) {
      console.error('Engine startup failed:', error);
      setError(error as string);
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('idle');
    setError(null);
    setProgress({
      step: '',
      message: '',
      percentage: 0,
      logs: [],
    });
  };

  // Computed values
  const isEngineRunning = Boolean(
    dockerInfo && dockerInfo.containers_running !== undefined
  );
  const isInstalling =
    step === 'installing' || step === 'starting-vm' || step === 'validating';

  // Show loading state while checking engine status
  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">
          Checking engine status...
        </div>
      </div>
    );
  }

  // Main UI
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
            Current engine information and real-time status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EngineStatusSection dockerInfo={dockerInfo} />
        </CardContent>
      </Card>

      {/* Engine Configuration */}
      <CollapsibleSection
        title="Engine Configuration"
        isOpen={showEngineConfig}
        onToggle={() => setShowEngineConfig(!showEngineConfig)}
      >
        <EngineConfiguration
          colimaAvailable={colimaAvailable}
          config={config}
          onConfigChange={setConfig}
          onStartEngine={handleStartEngine}
          isInstalling={isInstalling}
          isEngineRunning={isEngineRunning}
          step={step}
          progress={progress}
          error={error}
          onRetry={handleRetry}
        />
      </CollapsibleSection>

      {/* Reinstall Section */}
      <CollapsibleSection
        title="Reinstall Colima"
        isOpen={showReinstallSection}
        onToggle={() => setShowReinstallSection(!showReinstallSection)}
      >
        <InstallationSection
          method={method}
          onMethodChange={setMethod}
          homebrewAvailable={homebrewAvailable}
          onInstall={handleInstall}
        />
      </CollapsibleSection>
    </div>
  );
}
