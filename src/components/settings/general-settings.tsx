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
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useConfig } from '../../hooks/use-config';
import { UpdateChannel, Language } from '../../types/config';

export function GeneralSettings() {
  const {
    config,
    loading,
    error,
    updateTelemetrySettings,
    updateStartupSettings,
    updateLanguage,
  } = useConfig();
  const [saving, setSaving] = useState(false);

  const languageOptions = [
    { value: Language.English, label: 'English' },
    // { value: Language.Russian, label: 'Русский' },
  ];

  const handleTelemetryChange = async (sendAnonymousUsageData: boolean) => {
    if (!config) return;

    setSaving(true);
    try {
      await updateTelemetrySettings({
        send_anonymous_usage_data: sendAnonymousUsageData,
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
              onCheckedChange={handleTelemetryChange}
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
            </div>
            <Switch
              id="check-for-updates"
              checked={config.startup.check_for_updates}
              onCheckedChange={checked =>
                handleStartupChange('check_for_updates', checked)
              }
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="update-channel">Update Channel</Label>
            <Select
              value={config.startup.update_channel}
              onValueChange={(value: string) =>
                handleStartupChange('update_channel', value)
              }
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UpdateChannel.Stable}>Stable</SelectItem>
                <SelectItem value={UpdateChannel.Beta}>Beta</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Choose which update channel to use
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-update">Automatic updates</Label>
              <div className="text-sm text-muted-foreground">
                Automatically download and install updates
              </div>
            </div>
            <Switch
              id="auto-update"
              checked={config.startup.auto_update_settings}
              onCheckedChange={checked =>
                handleStartupChange('auto_update_settings', checked)
              }
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="crash-reporting">Crash reporting</Label>
              <div className="text-sm text-muted-foreground">
                Send crash reports to help improve stability
              </div>
            </div>
            <Switch
              id="crash-reporting"
              checked={config.startup.crash_reporting}
              onCheckedChange={checked =>
                handleStartupChange('crash_reporting', checked)
              }
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Docker Hub Integration</CardTitle>
          <CardDescription>
            Connect your Docker Hub account for seamless image management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">
              Not available right now
            </Badge>
          </div>
          <div className="space-y-2 opacity-50">
            <Label htmlFor="docker-username">Docker Hub Username</Label>
            <Input
              id="docker-username"
              placeholder="Enter your Docker Hub username"
              disabled
            />
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" disabled>
              Test Connection
            </Button>
            <Button disabled>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
