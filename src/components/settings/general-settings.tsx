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

export function GeneralSettings() {
  const [settings, setSettings] = useState({
    startOnBoot: true,
    minimizeToTray: true,
    autoUpdate: false,
    showNotifications: true,
    sendUsageStats: false,
    dockerHubUsername: '',
  });

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
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
              checked={settings.sendUsageStats}
              onCheckedChange={checked =>
                handleSettingChange('sendUsageStats', checked)
              }
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
              checked={settings.startOnBoot}
              onCheckedChange={checked =>
                handleSettingChange('startOnBoot', checked)
              }
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
              checked={settings.minimizeToTray}
              onCheckedChange={checked =>
                handleSettingChange('minimizeToTray', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Updates & Notifications</CardTitle>
          <CardDescription>
            Manage update preferences and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-update">Automatic updates</Label>
                <Badge variant="secondary" className="text-xs">
                  Not available right now
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Automatically download and install updates
              </div>
            </div>
            <Switch
              id="auto-update"
              checked={settings.autoUpdate}
              onCheckedChange={checked =>
                handleSettingChange('autoUpdate', checked)
              }
              disabled
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-notifications">Show notifications</Label>
              <div className="text-sm text-muted-foreground">
                Display desktop notifications for container events
              </div>
            </div>
            <Switch
              id="show-notifications"
              checked={settings.showNotifications}
              onCheckedChange={checked =>
                handleSettingChange('showNotifications', checked)
              }
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
              value={settings.dockerHubUsername}
              onChange={e =>
                handleSettingChange('dockerHubUsername', e.target.value)
              }
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
