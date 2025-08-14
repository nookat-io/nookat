import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/loading-spinner';
import { invoke } from '@tauri-apps/api/core';
import { VmResourceConfig, VmConfig } from './vm-resource-config';

interface HomebrewStatus {
  is_available: boolean;
  version?: string;
}

export function HomebrewInstallation() {
  const [homebrewStatus, setHomebrewStatus] = useState<HomebrewStatus | null>(
    null
  );
  const [isChecking, setIsChecking] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isStartingVm, setIsStartingVm] = useState(false);
  const [installationLogs, setInstallationLogs] = useState<string[]>([]);
  const [vmStartupLogs, setVmStartupLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const installationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const vmStartupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [vmConfig, setVmConfig] = useState<VmConfig>({
    cpu_cores: 2,
    memory_gb: 4,
    disk_gb: 20,
    architecture: 'auto',
  });

  useEffect(() => {
    checkHomebrewAvailability();
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (installationIntervalRef.current) {
        clearInterval(installationIntervalRef.current);
      }
      if (vmStartupIntervalRef.current) {
        clearInterval(vmStartupIntervalRef.current);
      }
    };
  }, []);

  const checkHomebrewAvailability = async () => {
    try {
      setIsChecking(true);
      const status = await invoke<HomebrewStatus>(
        'check_homebrew_availability'
      );
      setHomebrewStatus(status);
    } catch (err) {
      setError(`Failed to check Homebrew availability: ${err}`);
    } finally {
      setIsChecking(false);
    }
  };

  const startInstallation = async () => {
    try {
      setIsInstalling(true);
      setError(null);
      setInstallationLogs([]);

      // Start the background installation
      await invoke('start_colima_installation');

      // Start polling for logs every 500ms
      installationIntervalRef.current = setInterval(async () => {
        try {
          const logs = await invoke<string[]>('get_installation_logs');
          setInstallationLogs(logs);

          // Check if installation is complete
          if (
            logs.some(
              log =>
                log.includes('All components installed successfully') ||
                log.includes('failed')
            )
          ) {
            if (installationIntervalRef.current) {
              clearInterval(installationIntervalRef.current);
              installationIntervalRef.current = null;
            }
            setIsInstalling(false);
          }
        } catch (err) {
          console.error('Failed to get installation logs:', err);
        }
      }, 500);
    } catch (err) {
      setError(`Failed to start installation: ${err}`);
      setIsInstalling(false);
    }
  };

  const startVm = async () => {
    try {
      setIsStartingVm(true);
      setError(null);
      setVmStartupLogs([]);

      // Start the background VM startup
      await invoke('start_colima_vm_background', { config: vmConfig });

      // Start polling for logs every 500ms
      vmStartupIntervalRef.current = setInterval(async () => {
        try {
          const logs = await invoke<string[]>('get_vm_startup_logs');
          setVmStartupLogs(logs);

          // Check if VM startup is complete
          if (
            logs.some(
              log =>
                log.includes('Colima VM started successfully') ||
                log.includes('failed')
            )
          ) {
            if (vmStartupIntervalRef.current) {
              clearInterval(vmStartupIntervalRef.current);
              vmStartupIntervalRef.current = null;
            }
            setIsStartingVm(false);
          }
        } catch (err) {
          console.error('Failed to get VM startup logs:', err);
        }
      }, 500);
    } catch (err) {
      setError(`Failed to start VM: ${err}`);
      setIsStartingVm(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Checking Homebrew availability...</span>
      </div>
    );
  }

  if (!homebrewStatus?.is_available) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Homebrew Not Available</CardTitle>
          <CardDescription>
            Homebrew is required to install Colima on macOS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please install Homebrew first by running this command in Terminal:
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm">
              /bin/bash -c "$(curl -fsSL
              https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            </div>
            <Button onClick={checkHomebrewAvailability} variant="outline">
              Check Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Homebrew Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary">Homebrew</Badge>
            Available
          </CardTitle>
          {homebrewStatus.version && (
            <CardDescription>Version: {homebrewStatus.version}</CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Installation Step */}
      <Card>
        <CardHeader>
          <CardTitle>Install Colima</CardTitle>
          <CardDescription>
            {isInstalling
              ? 'Installing Colima, Docker CLI, and Docker Compose...'
              : 'Install Colima, Docker CLI, and Docker Compose using Homebrew'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isInstalling ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span>Installation in progress...</span>
            </div>
          ) : (
            <Button onClick={startInstallation} disabled={isInstalling}>
              Install Colima
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Installation Logs */}
      {installationLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Installation Logs
              {isInstalling && <LoadingSpinner size="sm" />}
            </CardTitle>
            <CardDescription>
              {isInstalling
                ? 'Installing components...'
                : 'Installation completed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-md max-h-64 overflow-y-auto">
              {installationLogs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* VM Configuration */}
      {!isInstalling && installationLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>VM Configuration</CardTitle>
            <CardDescription>
              {isStartingVm
                ? 'Starting Colima VM with configured resources...'
                : 'Configure resources for the Colima VM'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isStartingVm ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>VM startup in progress...</span>
              </div>
            ) : (
              <VmResourceConfig
                config={vmConfig}
                onConfigChange={setVmConfig}
                onSubmit={startVm}
                isSubmitting={isStartingVm}
                submitLabel="Start Colima VM"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* VM Startup Logs */}
      {vmStartupLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              VM Startup Logs
              {isStartingVm && <LoadingSpinner size="sm" />}
            </CardTitle>
            <CardDescription>
              {isStartingVm ? 'Starting VM...' : 'VM startup completed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-md max-h-64 overflow-y-auto">
              {vmStartupLogs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
            <Button
              onClick={() => setError(null)}
              variant="outline"
              className="mt-2"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
