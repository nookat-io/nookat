import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
import { Separator } from '../ui/separator';
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
} from 'lucide-react';

type InstallationMethod = 'homebrew' | 'binary';
type InstallationStep =
  | 'selecting'
  | 'installing'
  | 'configuring'
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
  const [step, setStep] = useState<InstallationStep>('selecting');
  const [homebrewAvailable, setHomebrewAvailable] = useState<boolean | null>(
    null
  );
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

  // Check if Homebrew is available on the system
  useEffect(() => {
    const checkHomebrew = async () => {
      try {
        // Call the real Tauri backend endpoint
        const isAvailable = await invoke<boolean>(
          'check_homebrew_availability'
        );
        setHomebrewAvailable(isAvailable);

        // If Homebrew is not available, default to binary method
        if (!isAvailable && method === 'homebrew') {
          setMethod('binary');
        }
      } catch (error) {
        console.error('Error checking Homebrew availability:', error);
        setHomebrewAvailable(false);
        if (method === 'homebrew') {
          setMethod('binary');
        }
      }
    };

    checkHomebrew();
  }, [method]);

  const handleInstall = async () => {
    setStep('installing');
    setError(null);

    // Mock installation process for now
    const mockSteps = [
      {
        step: 'Checking prerequisites...',
        message: 'Verifying system requirements',
        percentage: 10,
      },
      {
        step: 'Installing dependencies...',
        message: 'Downloading and installing required packages',
        percentage: 30,
      },
      {
        step: 'Setting up Colima...',
        message: 'Configuring Colima VM environment',
        percentage: 60,
      },
      {
        step: 'Starting VM...',
        message: 'Launching Colima virtual machine',
        percentage: 80,
      },
      {
        step: 'Finalizing...',
        message: 'Completing setup and configuration',
        percentage: 95,
      },
    ];

    for (const mockStep of mockSteps) {
      setProgress(prev => ({
        ...prev,
        step: mockStep.step,
        message: mockStep.message,
        percentage: mockStep.percentage,
        logs: [...prev.logs, `[INFO] ${mockStep.step}`],
      }));

      // Simulate installation time
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setStep('validating');
    setProgress(prev => ({
      step: 'Validating installation...',
      message: 'Testing Docker connectivity and Colima status',
      percentage: 100,
      logs: [...prev.logs, '[INFO] Installation completed successfully'],
    }));

    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 2000));

    setStep('complete');
  };

  const handleRetry = () => {
    setStep('selecting');
    setError(null);
    setProgress({
      step: '',
      message: '',
      percentage: 0,
      logs: [],
    });
  };

  const isInstalling =
    step === 'installing' || step === 'configuring' || step === 'validating';

  if (step === 'complete') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            Installation Complete!
          </CardTitle>
          <CardDescription>
            Colima has been successfully installed and configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Engine is ready to use</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
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
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            Installation Failed
          </CardTitle>
          <CardDescription>
            There was an error during the installation process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error Details</span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error || 'An unexpected error occurred during installation.'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRetry} variant="outline">
              Try Again
            </Button>
            <Button onClick={handleRetry}>Retry Installation</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Installation Method Selection */}
      {step === 'selecting' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Choose Installation Method
            </CardTitle>
            <CardDescription>
              Select how you'd like to install the container engine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Method Selection */}
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

            <Separator />

            {/* Configuration Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Server className="h-4 w-4" />
                VM Configuration
              </h3>
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

            <Separator />

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
              Install Container Engine
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Installation Progress */}
      {isInstalling && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Installing Container Engine
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
              <Label className="text-sm font-medium">Installation Logs</Label>
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
      )}
    </div>
  );
}
