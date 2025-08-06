'use client';

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
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

import {
  AlertTriangle,
  Server,
  HardDrive,
  Cpu,
  Package,
  Info,
  Activity,
  Settings,
  Shield,
} from 'lucide-react';

import { DockerInfo, DockerStatus } from '../../types/docker-info';
import { EngineState } from '../../types/engine-status';
import { useEngineStatus } from '../../hooks/useEngineStatus';

export function EngineSettings() {
  const [settings, setSettings] = useState({
    experimentalFeatures: false,
    daemonConfig: `{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "registry-mirrors": [],
  "insecure-registries": [],
  "debug": false
}`,
  });

  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { state: engineStateCtx, error: engineError } = useEngineStatus();

  useEffect(() => {
    const fetchDockerInfo = async () => {
      try {
        setLoading(true);
        const info = await invoke<DockerInfo>('get_docker_info');
        setDockerInfo(info);
        setError(null);
      } catch (err) {
        const errorMsg = err as string;
        setError(errorMsg);
        setDockerInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDockerInfo();
  }, []);

  const formatBytes = (bytes?: number) => {
    if (bytes === null || bytes === undefined) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getDockerStatus = () => {
    // error from our EngineStatusProvider
    if (engineError) {
      return {
        status: DockerStatus.Error,
        className:
          'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
        text: 'Error',
      };
    }

    // healthy vs. not running/installed from context
    if (engineStateCtx === EngineState.Healthy) {
      return {
        status: EngineState.Healthy,
        className:
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        text: 'Running',
      };
    }

    // fallback for both NotRunning and NotInstalled
    return {
      status: EngineState.NotRunning,
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      text: 'Stopped',
    };
  };

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
          ) : dockerInfo ? (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Engine Status</div>
                    <Badge className={getDockerStatus().className}>
                      {getDockerStatus().text}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Containers</div>
                    <div className="text-lg font-semibold">
                      {dockerInfo.containers_running || 0} running /{' '}
                      {dockerInfo.containers || 0} total
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 rounded-lg border">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <HardDrive className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Images</div>
                    <div className="text-lg font-semibold">
                      {dockerInfo.images || 0}
                    </div>
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
                    <Label className="text-sm font-medium">
                      Engine Version
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      {dockerInfo.version || 'Unknown'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">API Version</Label>
                    <div className="text-sm text-muted-foreground">
                      {dockerInfo.api_version || 'Unknown'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Storage Driver
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      {dockerInfo.driver || 'Unknown'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Operating System
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      {dockerInfo.operating_system || 'Unknown'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Architecture</Label>
                    <div className="text-sm text-muted-foreground">
                      {dockerInfo.architecture || 'Unknown'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Kernel Version
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      {dockerInfo.kernel_version || 'Unknown'}
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
                        {dockerInfo.ncpu || 0}
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
                        {formatBytes(dockerInfo.mem_total)}
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
                    This shows system capacity, not current utilization.
                    Real-time resource usage statistics are not available
                    through the Docker API.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Container Statistics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Container Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {dockerInfo.containers_running || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Running</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {dockerInfo.containers_paused || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Paused</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {dockerInfo.containers_stopped || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Stopped</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {dockerInfo.images || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Images</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Advanced Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Docker Root Directory
                      </Label>
                      <div className="text-sm text-muted-foreground font-mono">
                        {dockerInfo.docker_root_dir || 'Unknown'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Logging Driver
                      </Label>
                      <div className="text-sm text-muted-foreground">
                        {dockerInfo.logging_driver || 'Unknown'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Cgroup Driver
                      </Label>
                      <div className="text-sm text-muted-foreground">
                        {dockerInfo.cgroup_driver || 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Go Version</Label>
                      <div className="text-sm text-muted-foreground">
                        {dockerInfo.go_version || 'Unknown'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Git Commit</Label>
                      <div className="text-sm text-muted-foreground font-mono">
                        {dockerInfo.git_commit || 'Unknown'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Build Time</Label>
                      <div className="text-sm text-muted-foreground">
                        {dockerInfo.build_time || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {dockerInfo.warnings && dockerInfo.warnings.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Warnings
                    </h3>
                    <div className="space-y-2">
                      {dockerInfo.warnings.map((warning, index) => (
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

      {/* Docker Engine Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Docker Engine Configuration
          </CardTitle>
          <CardDescription>
            Configure the Docker daemon settings and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Experimental Features</Label>
              <div className="text-sm text-muted-foreground">
                Enable experimental Docker features (may be unstable)
              </div>
            </div>
            <Switch
              checked={settings.experimentalFeatures}
              onCheckedChange={checked =>
                setSettings(prev => ({
                  ...prev,
                  experimentalFeatures: checked,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Daemon Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Daemon Configuration (daemon.json)
          </CardTitle>
          <CardDescription>
            Edit the Docker daemon configuration file directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">
              Not available right now
            </Badge>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 opacity-50">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Warning
              </span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
              Modifying daemon configuration requires restarting Docker Engine.
              Invalid configuration may prevent Docker from starting.
            </p>
          </div>

          <div className="space-y-2 opacity-50">
            <Label htmlFor="daemon-config">Configuration JSON</Label>
            <Textarea
              id="daemon-config"
              value={settings.daemonConfig}
              onChange={e =>
                setSettings(prev => ({ ...prev, daemonConfig: e.target.value }))
              }
              className="font-mono text-sm"
              rows={12}
              disabled
            />
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" disabled>
              Validate Config
            </Button>
            <Button variant="outline" disabled>
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button disabled>Apply Configuration</Button>
      </div>
    </div>
  );
}
