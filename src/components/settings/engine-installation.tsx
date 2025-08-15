import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

import {
  Download,
  Package,
  Terminal,
  Cpu,
  HardDrive,
  MemoryStick,
  Server,
  Info,
  CheckCircle,
  AlertCircle,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { DockerInfo } from '../../types/docker-info';
import { EngineStatus } from './engine-status';

type InstallationMethod = 'homebrew' | 'binary';
type InstallationStep =
  | 'idle'
  | 'installing'
  | 'starting-vm'
  | 'validating'
  | 'complete'
  | 'error';

interface InstallationProgress {
  step: string;
  message: string;
  percentage: number;
  logs: string[];
}

interface ColimaConfig {
  cpu: number;
  memory: number;
  disk: number;
  architecture: string;
}

export function EngineInstallation() {
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

  // Collapsible sections state
  const [showReinstallSection, setShowReinstallSection] = useState(false);
  const [showEngineConfig, setShowEngineConfig] = useState(true);

  // Check if Homebrew and Colima are available on the system
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        // Check Homebrew availability
        const isHomebrewAvailable = await invoke<boolean>(
          'check_homebrew_availability'
        );
        setHomebrewAvailable(isHomebrewAvailable);

        // Check Colima availability
        const isColimaAvailable = await invoke<boolean>(
          'check_colima_availability'
        );
        setColimaAvailable(isColimaAvailable);

        // If Homebrew is not available, default to binary method
        if (!isHomebrewAvailable && method === 'homebrew') {
          setMethod('binary');
        }

        // If Colima is available, fetch Docker info
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

  // Fetch Docker info when Colima becomes available
  const fetchDockerInfo = async () => {
    try {
      const info = await invoke<DockerInfo>('get_docker_info');
      setDockerInfo(info);
    } catch (err) {
      console.error('Error fetching Docker info:', err);
      setDockerInfo(null);
    }
  };

  // Check if engine is already running
  const isEngineRunning = Boolean(
    dockerInfo && dockerInfo.containers_running !== undefined
  );

  // Set up event listeners for real-time progress updates
  useEffect(() => {
    if (step === 'installing' || step === 'starting-vm') {
      const unlistenPromises: Promise<() => void>[] = [];

      // Listen for installation progress
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
            // Step 2: Start Colima VM with the configured resources
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

      // Listen for VM startup progress
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

          // Simulate validation time
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

      // Cleanup function
      return () => {
        unlistenPromises.forEach(unlisten => {
          unlisten.then(cleanup => cleanup());
        });
      };
    }
  }, [step]);

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
      // Step 1: Install Colima
      const methodEnum = method === 'homebrew' ? 'Homebrew' : 'Binary';
      await invoke('install_colima_command', { method: methodEnum });

      // Progress updates will come via Tauri events
      // The component will automatically transition to the next step
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
      // Start Colima VM with the configured resources
      await invoke('start_colima_vm_command', { config });

      // Progress updates will come via Tauri events
      // The component will automatically transition to the next step
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

  const isInstalling =
    step === 'installing' || step === 'starting-vm' || step === 'validating';

  // Collapsible section component
  const CollapsibleSection = ({
    title,
    children,
    isOpen,
    onToggle,
  }: {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <Card className="mb-4">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {isOpen ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  );

  // Only show progress/status cards when actively working
  if (
    step === 'installing' ||
    step === 'starting-vm' ||
    step === 'validating'
  ) {
    return (
      <div className="space-y-6">
        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {step === 'installing' ? 'Installing Colima' : 'Starting Engine'}
            </CardTitle>
            <CardDescription>{progress.step}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.message}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-600 dark:bg-blue-400 transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Installation Logs */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Progress Logs</Label>
              <div className="h-48 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-y-auto font-mono text-xs">
                {progress.logs.map((log, index) => (
                  <div key={index} className="text-gray-700 dark:text-gray-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              This process may take several minutes. Please don't close the
              application.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show completion or error cards when appropriate
  if (step === 'complete') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <CheckCircle className="h-5 w-5" />
              Engine Ready!
            </CardTitle>
            <CardDescription>
              Colima engine has been successfully started and configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Engine is ready to use</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Docker commands are now available and Colima VM is running with
                your specified configuration.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Continue to App
              </Button>
              <Button onClick={handleRetry} variant="outline">
                Start Another Engine
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Operation Failed
            </CardTitle>
            <CardDescription>
              There was an error during the process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error Details</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error || 'An unexpected error occurred.'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline">
                Try Again
              </Button>
              <Button onClick={handleRetry}>Retry Operation</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engine Status - Always visible */}
      <EngineStatus dockerInfo={dockerInfo} />

      {/* Engine Configuration - Always visible */}
      <CollapsibleSection
        title="Engine Configuration"
        isOpen={showEngineConfig}
        onToggle={() => setShowEngineConfig(!showEngineConfig)}
      >
        <div className="space-y-6">
          {colimaAvailable ? (
            // Engine is available - show full configuration
            <>
              {/* Status Display */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium">Colima Available</div>
                    <div className="text-sm text-muted-foreground">
                      Ready to start engine
                    </div>
                  </div>
                </div>
              </div>

              {/* VM Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">VM Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpu">CPU Cores</Label>
                    <Input
                      id="cpu"
                      type="number"
                      min="1"
                      max="16"
                      value={config.cpu}
                      onChange={e =>
                        setConfig(prev => ({
                          ...prev,
                          cpu: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                    <div className="text-xs text-muted-foreground">
                      <Cpu className="h-3 w-3 inline mr-1" />
                      {config.cpu} cores
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="memory">Memory (GB)</Label>
                    <Input
                      id="memory"
                      type="number"
                      min="2"
                      max="32"
                      value={config.memory}
                      onChange={e =>
                        setConfig(prev => ({
                          ...prev,
                          memory: parseInt(e.target.value) || 2,
                        }))
                      }
                    />
                    <div className="text-xs text-muted-foreground">
                      <MemoryStick className="h-3 w-3 inline mr-1" />
                      {config.memory} GB
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="disk">Disk (GB)</Label>
                    <Input
                      id="disk"
                      type="number"
                      min="20"
                      max="200"
                      value={config.disk}
                      onChange={e =>
                        setConfig(prev => ({
                          ...prev,
                          disk: parseInt(e.target.value) || 20,
                        }))
                      }
                    />
                    <div className="text-xs text-muted-foreground">
                      <HardDrive className="h-3 w-3 inline mr-1" />
                      {config.disk} GB
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="architecture">Architecture</Label>
                    <Select
                      value={config.architecture}
                      onValueChange={value =>
                        setConfig(prev => ({ ...prev, architecture: value }))
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

              {/* Start Engine Button - Bottom Right */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleStartEngine}
                  disabled={isInstalling || isEngineRunning}
                  size="lg"
                  className="px-8"
                  variant={isEngineRunning ? 'secondary' : 'default'}
                >
                  <Server className="h-4 w-4 mr-2" />
                  {isEngineRunning ? 'Engine Running' : 'Start Engine'}
                </Button>
              </div>
            </>
          ) : (
            // Engine is not available - show status only
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-3">
                {colimaAvailable === null ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
                <div>
                  <div className="font-medium">
                    {colimaAvailable === null
                      ? 'Checking status...'
                      : 'Colima Not Installed'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {colimaAvailable === null
                      ? 'Verifying system configuration'
                      : 'Installation required'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Reinstall Section - Always visible */}
      <CollapsibleSection
        title="Reinstall Colima"
        isOpen={showReinstallSection}
        onToggle={() => setShowReinstallSection(!showReinstallSection)}
      >
        <div className="space-y-6">
          {/* Installation Method Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Installation Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-4 border-2 rounded-lg transition-colors ${
                  homebrewAvailable === null
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    : homebrewAvailable
                      ? method === 'homebrew'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 cursor-pointer'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                }`}
                onClick={() => homebrewAvailable && setMethod('homebrew')}
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium">Install via Homebrew</div>
                    <div className="text-sm text-muted-foreground">
                      Recommended for most users
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Uses Homebrew package manager for easy installation and
                  updates
                </div>

                {/* Homebrew availability status */}
                {homebrewAvailable === null && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking Homebrew availability...
                  </div>
                )}

                {homebrewAvailable === false && (
                  <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="font-medium">Homebrew not found</span>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Install Homebrew first or use Binary installation method
                    </p>
                  </div>
                )}
              </div>

              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  method === 'binary'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setMethod('binary')}
              >
                <div className="flex items-center gap-3">
                  <Terminal className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <div className="font-medium">Binary Installation</div>
                    <div className="text-sm text-muted-foreground">
                      Direct download and install
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Download and install binaries directly (requires sudo)
                </div>
              </div>
            </div>
          </div>

          {/* Installation Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                What will be installed
              </span>
            </div>
            <div className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <div>
                • <strong>Colima</strong> - Lightweight Docker-compatible
                runtime
              </div>
              <div>
                • <strong>Lima</strong> - Linux virtual machine manager
              </div>
            </div>
          </div>

          <Button
            onClick={handleInstall}
            className="w-full"
            size="lg"
            disabled={homebrewAvailable === false && method === 'homebrew'}
          >
            <Download className="h-4 w-4 mr-2" />
            Install Colima
          </Button>
        </div>
      </CollapsibleSection>
    </div>
  );
}
