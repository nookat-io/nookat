'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';

export function GeneralSettings() {
  const [settings, setSettings] = useState({
    startOnBoot: true,
    minimizeToTray: true,
    autoUpdate: false,
    showNotifications: true,
    dockerHubUsername: '',
  });

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Startup Settings</CardTitle>
          <CardDescription>
            Configure how DockerWeb starts and behaves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="start-on-boot">Start DockerWeb on system boot</Label>
              <div className="text-sm text-muted-foreground">
                Automatically launch DockerWeb when your system starts
              </div>
            </div>
            <Switch 
              id="start-on-boot"
              checked={settings.startOnBoot}
              onCheckedChange={(checked) => handleSettingChange('startOnBoot', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="minimize-to-tray">Minimize to system tray</Label>
              <div className="text-sm text-muted-foreground">
                Keep DockerWeb running in the background
              </div>
            </div>
            <Switch 
              id="minimize-to-tray"
              checked={settings.minimizeToTray}
              onCheckedChange={(checked) => handleSettingChange('minimizeToTray', checked)}
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
              <Label htmlFor="auto-update">Automatic updates</Label>
              <div className="text-sm text-muted-foreground">
                Automatically download and install updates
              </div>
            </div>
            <Switch 
              id="auto-update"
              checked={settings.autoUpdate}
              onCheckedChange={(checked) => handleSettingChange('autoUpdate', checked)}
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
              onCheckedChange={(checked) => handleSettingChange('showNotifications', checked)}
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
          <div className="space-y-2">
            <Label htmlFor="docker-username">Docker Hub Username</Label>
            <Input
              id="docker-username"
              placeholder="Enter your Docker Hub username"
              value={settings.dockerHubUsername}
              onChange={(e) => handleSettingChange('dockerHubUsername', e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline">Test Connection</Button>
            <Button>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}