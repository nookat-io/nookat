'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useConfig } from '../../hooks/use-config';
import { useUpdater } from '../../hooks/use-updater';
import { Language } from '../../types/config';
import { Download, RefreshCw } from 'lucide-react';

export function GeneralSettings() {
  const {
    config,
    loading,
    error,
    updateTelemetrySettings,
    updateStartupSettings,
    updateLanguage,
    updateLastUpdateCheck,
  } = useConfig();
  const {
    isChecking,
    updateAvailable,
    currentUpdate,
    checkForUpdates,
    downloadAndInstall,
    isBusy,
    isDownloading,
    isInstalling,
    progress,
  } = useUpdater(config || undefined, updateLastUpdateCheck);
  const [saving, setSaving] = useState(false);

  // Get current app version from environment
  const currentVersion = import.meta.env.VITE_APP_VERSION || 'unknown';

  const languageOptions = [
    { value: Language.English, label: 'English' },
    // { value: Language.Russian, label: 'Русский' },
  ];

  const handleTelemetryChange = async (
    sendAnonymousUsageData: boolean,
    errorReporting: boolean
  ) => {
    if (!config) return;

    setSaving(true);
    try {
      await updateTelemetrySettings({
        send_anonymous_usage_data: sendAnonymousUsageData,
        error_reporting: errorReporting,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStartupChange = async (key: string, value: boolean | string) => {
    if (!config) return;

    setSaving(true);
    try {
      const updatedSettings = {
        ...config.startup,
        [key]: value,
      };
      await updateStartupSettings(updatedSettings);
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    setSaving(true);
    try {
      await updateLanguage(language as Language);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Failed to load settings: {error}</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>
            Choose your preferred language for the application interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language-select">Interface Language</Label>
            <Select
              value={config.language}
              onValueChange={handleLanguageChange}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Changes will take effect after restarting the application
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>
            Help improve Nookat by sharing anonymous usage data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="send-usage-stats">
                Send anonymous usage statistics
              </Label>
              <div className="text-sm text-muted-foreground">
                Help improve Nookat by sending anonymous usage data
              </div>
            </div>
            <Switch
              id="send-usage-stats"
              checked={config.telemetry.send_anonymous_usage_data}
              onCheckedChange={checked =>
                handleTelemetryChange(checked, config.telemetry.error_reporting)
              }
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="crash-reporting">Crash reporting</Label>
              <div className="text-sm text-muted-foreground">
                Send crash reports to help improve stability
              </div>
            </div>
            <Switch
              id="crash-reporting"
              checked={config.telemetry.error_reporting}
              onCheckedChange={checked =>
                handleTelemetryChange(
                  config.telemetry.send_anonymous_usage_data,
                  checked
                )
              }
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Startup Settings</CardTitle>
          <CardDescription>
            Configure how Nookat starts and behaves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="start-on-boot">Start Nookat on system boot</Label>
              <div className="text-sm text-muted-foreground">
                Automatically launch Nookat when your system starts
              </div>
            </div>
            <Switch
              id="start-on-boot"
              checked={config.startup.start_on_system_startup}
              onCheckedChange={checked =>
                handleStartupChange('start_on_system_startup', checked)
              }
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="minimize-to-tray">Minimize to system tray</Label>
              <div className="text-sm text-muted-foreground">
                Keep Nookat running in the background
              </div>
            </div>
            <Switch
              id="minimize-to-tray"
              checked={config.startup.minimize_to_tray}
              onCheckedChange={checked =>
                handleStartupChange('minimize_to_tray', checked)
              }
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="check-for-updates">Check for updates</Label>
              <div className="text-sm text-muted-foreground">
                Automatically check for new versions
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Current version:{' '}
                <Badge variant="secondary">{currentVersion}</Badge>
                {config?.startup.last_update_check && (
                  <span className="ml-2">
                    • Last checked:{' '}
                    {new Date(
                      config.startup.last_update_check
                    ).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkForUpdates}
                disabled={isChecking || saving}
                className="flex items-center gap-1"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`}
                />
                {isChecking ? 'Checking...' : 'Check Now'}
              </Button>
              <Switch
                id="check-for-updates"
                checked={config.startup.check_for_updates}
                onCheckedChange={checked =>
                  handleStartupChange('check_for_updates', checked)
                }
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-update">Automatic updates</Label>
              <div className="text-sm text-muted-foreground">
                Automatically download and install updates
              </div>
              {updateAvailable && currentUpdate && (
                <div className="text-xs text-muted-foreground mt-1">
                  Update available:{' '}
                  <Badge variant="default">{currentUpdate.version}</Badge>
                </div>
              )}
              {/* Show download progress */}
              {isDownloading && progress && (
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Downloading update...</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {Math.round((progress.downloaded / 1024 / 1024) * 100) /
                      100}{' '}
                    MB /{' '}
                    {Math.round((progress.total / 1024 / 1024) * 100) / 100} MB
                  </div>
                </div>
              )}
              {/* Show installing state */}
              {isInstalling && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Installing update...
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {updateAvailable && currentUpdate && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={downloadAndInstall}
                  disabled={isBusy || saving}
                  className="flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  {isDownloading
                    ? 'Downloading...'
                    : isInstalling
                      ? 'Installing...'
                      : 'Install Update'}
                </Button>
              )}
              <Switch
                id="auto-update"
                checked={config.startup.auto_update_settings}
                onCheckedChange={checked =>
                  handleStartupChange('auto_update_settings', checked)
                }
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
