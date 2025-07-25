'use client';

import { useState } from 'react';
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
import { AlertTriangle } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Docker Engine Configuration</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Daemon Configuration (daemon.json)</CardTitle>
          <CardDescription>
            Edit the Docker daemon configuration file directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
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

          <div className="space-y-2">
            <Label htmlFor="daemon-config">Configuration JSON</Label>
            <Textarea
              id="daemon-config"
              value={settings.daemonConfig}
              onChange={e =>
                setSettings(prev => ({ ...prev, daemonConfig: e.target.value }))
              }
              className="font-mono text-sm"
              rows={12}
            />
          </div>

          <div className="flex space-x-2">
            <Button variant="outline">Validate Config</Button>
            <Button variant="outline">Reset to Default</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engine Status</CardTitle>
          <CardDescription>
            Current Docker engine information and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Engine Version</Label>
              <div className="text-sm text-muted-foreground">24.0.7</div>
            </div>
            <div>
              <Label className="text-sm font-medium">API Version</Label>
              <div className="text-sm text-muted-foreground">1.43</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Storage Driver</Label>
              <div className="text-sm text-muted-foreground">overlay2</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Running
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline">Restart Engine</Button>
        <Button>Apply Configuration</Button>
      </div>
    </div>
  );
}
