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
import { Separator } from '../ui/separator';

import { AlertTriangle, Cpu, Package, Info, Activity } from 'lucide-react';

import { DockerInfo } from '../../types/docker-info';

interface EngineStatusProps {
  dockerInfo?: DockerInfo | null;
}

export function EngineStatus({ dockerInfo }: EngineStatusProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localDockerInfo, setLocalDockerInfo] = useState<DockerInfo | null>(
    null
  );

  useEffect(() => {
    // If dockerInfo is provided as prop, use it
    if (dockerInfo !== undefined) {
      setLocalDockerInfo(dockerInfo);
      setLoading(false);
      setError(null);
      return;
    }

    // Otherwise, fetch it internally (for backward compatibility)
    const fetchDockerInfo = async () => {
      try {
        setLoading(true);
        const info = await invoke<DockerInfo>('get_docker_info');
        setLocalDockerInfo(info);
        setError(null);
      } catch (err) {
        const errorMsg = err as string;
        setError(errorMsg);
        setLocalDockerInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDockerInfo();
  }, [dockerInfo]);

  const formatBytes = (bytes?: number) => {
    if (bytes === null || bytes === undefined) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
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
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">
              Loading engine information...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <div className="text-sm text-red-600 dark:text-red-400">
              Error loading engine information: {error}
            </div>
          </div>
        ) : localDockerInfo ? (
          <div className="space-y-6">
            {/* Status Overview */}

            {/* Container Statistics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Container Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {localDockerInfo.containers_running || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Running</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {localDockerInfo.containers_paused || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Paused</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {localDockerInfo.containers_stopped || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Stopped</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {localDockerInfo.images || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Images</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* System Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                System Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Engine Version</Label>
                  <div className="text-sm text-muted-foreground">
                    {localDockerInfo.version || 'Unknown'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">API Version</Label>
                  <div className="text-sm text-muted-foreground">
                    {localDockerInfo.api_version || 'Unknown'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Storage Driver</Label>
                  <div className="text-sm text-muted-foreground">
                    {localDockerInfo.driver || 'Unknown'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Operating System
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {localDockerInfo.operating_system || 'Unknown'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Architecture</Label>
                  <div className="text-sm text-muted-foreground">
                    {localDockerInfo.architecture || 'Unknown'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kernel Version</Label>
                  <div className="text-sm text-muted-foreground">
                    {localDockerInfo.kernel_version || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* System Capacity */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                System Capacity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>CPU Cores</span>
                    <span className="font-medium">
                      {localDockerInfo.ncpu || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div
                      className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total available CPU cores
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Memory</span>
                    <span className="font-medium">
                      {formatBytes(localDockerInfo.mem_total)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div
                      className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total available system memory
                  </div>
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Note
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  This shows system capacity, not current utilization. Real-time
                  resource usage statistics are not available through the Docker
                  API.
                </p>
              </div>
            </div>

            {/* Warnings */}
            {localDockerInfo.warnings &&
              localDockerInfo.warnings.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Warnings
                    </h3>
                    <div className="space-y-2">
                      {localDockerInfo.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                        >
                          <div className="text-sm text-amber-800 dark:text-amber-200">
                            {warning}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No engine information available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
