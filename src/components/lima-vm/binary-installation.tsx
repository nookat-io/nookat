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

export function BinaryInstallation({ onComplete }: { onComplete: () => void }) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isStartingVm, setIsStartingVm] = useState(false);
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
    'info' | 'download' | 'verify' | 'install' | 'start'
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
      await startColimaVm();
    } catch (err) {
      setError(`Installation failed: ${err}`);
      setIsInstalling(false);
    }
  };

  const startColimaVm = async () => {
    try {
      setIsStartingVm(true);
      setError(null);

      await invoke('start_colima_vm', { config: {} });

      // Installation complete
      onComplete();
    } catch (err) {
      setError(`Failed to start Colima VM: ${err}`);
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
