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
import { DownloadProgress } from './download-progress';
import { SecurityInfo } from './security-info';

interface VersionInfo {
  colima_version: string;
  lima_version: string;
  colima_checksum: string;
  lima_checksum: string;
  download_urls: {
    colima: string;
    lima: string;
  };
}

interface DownloadResult {
  colima_path: string;
  lima_path: string;
  download_size: number;
  download_time: number;
}

// NEW: Validation result interface for PHASE-004
interface ValidationResult {
  docker_working: boolean;
  colima_running: boolean;
  vm_accessible: boolean;
  issues: string[];
}

export function BinaryInstallation({ onComplete }: { onComplete: () => void }) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isStartingVm, setIsStartingVm] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [downloadProgress] = useState<{
    [key: string]: {
      total_bytes: number;
      downloaded_bytes: number;
      speed_bytes_per_sec: number;
      eta_seconds: number;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<
    'info' | 'download' | 'verify' | 'install' | 'start' | 'validate'
  >('info');
  const [installationLogs, setInstallationLogs] = useState<string[]>([]);
  const installationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadVersionInfo();
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (installationIntervalRef.current) {
        clearInterval(installationIntervalRef.current);
      }
    };
  }, []);

  const loadVersionInfo = async () => {
    try {
      setIsLoading(true);
      const info = await invoke<VersionInfo>('get_colima_versions');
      setVersionInfo(info);
    } catch (err) {
      setError(`Failed to load version information: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startPollingLogs = () => {
    // Clear any existing interval
    if (installationIntervalRef.current) {
      clearInterval(installationIntervalRef.current);
    }

    // Start polling for logs every 500ms
    installationIntervalRef.current = setInterval(async () => {
      try {
        const logs = await invoke<string[]>('get_binary_installation_logs');
        setInstallationLogs(logs);
      } catch (err) {
        console.error('Failed to get installation logs:', err);
      }
    }, 500);
  };

  const startDownload = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      setCurrentStep('download');
      setInstallationLogs([]);

      // Start polling for logs
      startPollingLogs();

      const result = await invoke<DownloadResult>('download_colima_binaries');
      console.log('Download completed:', result);

      setCurrentStep('verify');
      await verifyChecksums();
    } catch (err) {
      setError(`Download failed: ${err}`);
      setIsDownloading(false);
    }
  };

  const verifyChecksums = async () => {
    try {
      setIsVerifying(true);
      setError(null);

      const verified = await invoke<boolean>('verify_binary_checksums');

      if (verified) {
        setCurrentStep('install');
        await installBinaries();
      } else {
        setError(
          'Checksum verification failed. The downloaded binaries may be corrupted.'
        );
        setIsVerifying(false);
      }
    } catch (err) {
      setError(`Verification failed: ${err}`);
      setIsVerifying(false);
    }
  };

  const installBinaries = async () => {
    try {
      setIsInstalling(true);
      setError(null);

      await invoke('binary_install_colima');

      setCurrentStep('start');
      await startVm();
    } catch (err) {
      setError(`Installation failed: ${err}`);
      setIsInstalling(false);
    }
  };

  // NEW: Start validation after VM startup
  const startValidation = async () => {
    try {
      setIsValidating(true);
      setError(null);

      const result = await invoke<ValidationResult>(
        'validate_colima_installation'
      );
      setValidationResult(result);

      if (
        result.docker_working &&
        result.colima_running &&
        result.vm_accessible
      ) {
        // Save engine configuration
        const config = {
          installation_method: 'binary',
          vm_config: {
            cpu_cores: 2,
            memory_gb: 4,
            disk_gb: 20,
            architecture: 'auto',
          },
          installation_date: new Date().toISOString(),
          colima_version: versionInfo?.colima_version,
        };

        try {
          await invoke('save_engine_config', { config });
        } catch (err) {
          console.warn('Failed to save engine config:', err);
        }

        // Show success and redirect after a short delay
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (err) {
      setError(`Validation failed: ${err}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Enhanced VM startup to include validation
  const startVm = async () => {
    try {
      setIsStartingVm(true);
      setError(null);

      const config = {
        cpu_cores: 2,
        memory_gb: 4,
        disk_gb: 20,
        architecture: 'auto',
      };

      await invoke('start_colima_vm', { config });
      setCurrentStep('validate');

      // Start validation automatically after VM startup
      setTimeout(() => {
        startValidation();
      }, 3000); // Give VM time to fully start
    } catch (err) {
      setError(`Failed to start VM: ${err}`);
    } finally {
      setIsStartingVm(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Binary Installation</CardTitle>
          <CardDescription>Loading version information...</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!versionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Binary Installation</CardTitle>
          <CardDescription>Failed to load version information</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadVersionInfo}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Binary Installation</CardTitle>
        <CardDescription>
          Install Colima and Lima directly from official binaries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Information */}
        <SecurityInfo versionInfo={versionInfo} />

        {/* Installation Progress */}
        {currentStep !== 'info' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge
                variant={currentStep === 'download' ? 'default' : 'secondary'}
              >
                {currentStep === 'download' ? '⏳' : '✅'} Download
              </Badge>
              <Badge
                variant={currentStep === 'verify' ? 'default' : 'secondary'}
              >
                {currentStep === 'verify'
                  ? '⏳'
                  : currentStep === 'download'
                    ? '⏸️'
                    : '✅'}{' '}
                Verify
              </Badge>
              <Badge
                variant={currentStep === 'install' ? 'default' : 'secondary'}
              >
                {currentStep === 'install'
                  ? '⏳'
                  : currentStep === 'start'
                    ? '✅'
                    : '⏸️'}{' '}
                Install
              </Badge>
              <Badge
                variant={currentStep === 'start' ? 'default' : 'secondary'}
              >
                {currentStep === 'start' ? '⏳' : '⏸️'} Start VM
              </Badge>
            </div>

            {currentStep === 'download' && isDownloading && (
              <DownloadProgress progress={downloadProgress} />
            )}

            {currentStep === 'verify' && isVerifying && (
              <div className="flex items-center space-x-2">
                <LoadingSpinner />
                <span>Verifying binary checksums...</span>
              </div>
            )}

            {currentStep === 'install' && isInstalling && (
              <div className="flex items-center space-x-2">
                <LoadingSpinner />
                <span>Installing binaries...</span>
              </div>
            )}

            {currentStep === 'start' && isStartingVm && (
              <div className="flex items-center space-x-2">
                <LoadingSpinner />
                <span>Starting Colima VM...</span>
              </div>
            )}
          </div>
        )}

        {/* NEW: Validation Step */}
        {currentStep === 'validate' && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Validating Installation</h3>
              <p className="text-sm text-muted-foreground">
                Verifying that Colima is working correctly...
              </p>
            </div>

            {isValidating && (
              <div className="flex items-center justify-center space-x-2 py-8">
                <LoadingSpinner />
                <span>Running validation tests...</span>
              </div>
            )}

            {validationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl mb-2">
                      {validationResult.docker_working ? '✅' : '❌'}
                    </div>
                    <div className="text-sm font-medium">Docker CLI</div>
                    <div className="text-xs text-muted-foreground">
                      {validationResult.docker_working ? 'Working' : 'Failed'}
                    </div>
                  </div>

                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl mb-2">
                      {validationResult.colima_running ? '✅' : '❌'}
                    </div>
                    <div className="text-sm font-medium">Colima VM</div>
                    <div className="text-xs text-muted-foreground">
                      {validationResult.colima_running ? 'Running' : 'Stopped'}
                    </div>
                  </div>

                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl mb-2">
                      {validationResult.vm_accessible ? '✅' : '❌'}
                    </div>
                    <div className="text-sm font-medium">Docker Access</div>
                    <div className="text-xs text-muted-foreground">
                      {validationResult.vm_accessible
                        ? 'Accessible'
                        : 'Blocked'}
                    </div>
                  </div>
                </div>

                {validationResult.issues.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Issues Found:
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {validationResult.issues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.docker_working &&
                  validationResult.colima_running &&
                  validationResult.vm_accessible && (
                    <div className="text-center p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="text-2xl mb-2">🎉</div>
                      <h4 className="font-medium text-green-800">
                        Installation Successful!
                      </h4>
                      <p className="text-sm text-green-700">
                        Colima is now running and ready to use. Redirecting to
                        main app...
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Installation Logs */}
        {installationLogs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Installation Logs</h4>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  {installationLogs.length} entries
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await invoke('clear_binary_installation_logs');
                      setInstallationLogs([]);
                    } catch (err) {
                      console.error('Failed to clear logs:', err);
                    }
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 max-h-48 overflow-y-auto border">
              <div className="space-y-1 text-xs font-mono">
                {installationLogs.map((log, index) => (
                  <div key={index} className="text-gray-700 dark:text-gray-300">
                    {log}
                  </div>
                ))}
                {installationLogs.length > 0 && (
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                    --- End of logs ---
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        {currentStep === 'info' && (
          <div className="flex space-x-2">
            <Button
              onClick={startDownload}
              disabled={isDownloading}
              className="ml-auto"
            >
              {isDownloading ? (
                <>
                  <LoadingSpinner />
                  Downloading...
                </>
              ) : (
                'Start Binary Installation'
              )}
            </Button>
          </div>
        )}

        {currentStep !== 'info' && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep('info');
                setIsDownloading(false);
                setIsVerifying(false);
                setIsInstalling(false);
                setIsStartingVm(false);
                setError(null);
              }}
            >
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
