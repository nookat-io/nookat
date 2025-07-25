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
import { Slider } from '../ui/slider';
import { Input } from '../ui/input';

export function ResourceSettings() {
  const [resources, setResources] = useState({
    cpuLimit: [4],
    memoryLimit: [8],
    diskLimit: [64],
    swapLimit: [2],
  });

  const handleResourceChange = (key: string, value: number[]) => {
    setResources(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CPU & Memory</CardTitle>
          <CardDescription>
            Configure CPU and memory limits for Docker containers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>CPU Limit</Label>
              <span className="text-sm text-muted-foreground">
                {resources.cpuLimit[0]} cores
              </span>
            </div>
            <Slider
              value={resources.cpuLimit}
              onValueChange={value => handleResourceChange('cpuLimit', value)}
              max={16}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Maximum CPU cores available to Docker containers
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Memory Limit</Label>
              <span className="text-sm text-muted-foreground">
                {resources.memoryLimit[0]} GB
              </span>
            </div>
            <Slider
              value={resources.memoryLimit}
              onValueChange={value =>
                handleResourceChange('memoryLimit', value)
              }
              max={32}
              min={2}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Maximum RAM available to Docker containers
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Swap Limit</Label>
              <span className="text-sm text-muted-foreground">
                {resources.swapLimit[0]} GB
              </span>
            </div>
            <Slider
              value={resources.swapLimit}
              onValueChange={value => handleResourceChange('swapLimit', value)}
              max={8}
              min={0}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Maximum swap space available to Docker
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disk & Storage</CardTitle>
          <CardDescription>
            Configure disk space and storage settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Disk Image Size Limit</Label>
              <span className="text-sm text-muted-foreground">
                {resources.diskLimit[0]} GB
              </span>
            </div>
            <Slider
              value={resources.diskLimit}
              onValueChange={value => handleResourceChange('diskLimit', value)}
              max={500}
              min={20}
              step={4}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Maximum disk space for Docker images and containers
            </div>
          </div>

          <div className="space-y-2">
            <Label>Docker Root Directory</Label>
            <div className="flex space-x-2">
              <Input value="/var/lib/docker" readOnly className="flex-1" />
              <Button variant="outline">Change</Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Location where Docker stores images, containers, and volumes
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>Apply Settings</Button>
      </div>
    </div>
  );
}
