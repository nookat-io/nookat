import { Label } from '../../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import { Settings } from 'lucide-react';
import { ColimaConfig } from '../types';
import { ResourceInput } from './resource-input';
import { DockerInfo } from '../../../../types/docker-info';

const BYTES_PER_GIGABYTE = 1024 ** 3;

interface VmResourcesCardProps {
  dockerInfo: DockerInfo | null;
  config: ColimaConfig;
  onConfigChange: (config: ColimaConfig) => void;
  isEngineRunning: boolean;
}

export function VmResourcesCard({
  dockerInfo,
  config,
  onConfigChange,
  isEngineRunning,
}: VmResourcesCardProps) {
  const memoryInGigabytes = dockerInfo?.mem_total
    ? Math.round(dockerInfo.mem_total / BYTES_PER_GIGABYTE)
    : config.memory;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          VM Resources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResourceInput
            id="cpu"
            label="CPU Cores"
            value={dockerInfo?.ncpu ?? config.cpu}
            min={1}
            max={16}
            onChange={value => onConfigChange({ ...config, cpu: value })}
            disabled={isEngineRunning}
          />

          <ResourceInput
            id="memory"
            label="Memory (GB)"
            value={memoryInGigabytes}
            min={2}
            max={32}
            onChange={value => onConfigChange({ ...config, memory: value })}
            disabled={isEngineRunning}
          />

          <ResourceInput
            id="disk"
            label="Disk (GB)"
            value={config.disk}
            min={20}
            max={200}
            onChange={value => onConfigChange({ ...config, disk: value })}
            disabled={isEngineRunning}
          />

          <div className="space-y-2">
            <Label htmlFor="architecture">Architecture</Label>
            <Select
              value={
                dockerInfo?.architecture?.toLowerCase() ?? config.architecture
              }
              onValueChange={value =>
                onConfigChange({ ...config, architecture: value })
              }
              disabled={isEngineRunning}
            >
              <SelectTrigger id="architecture">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="x86_64">x86_64</SelectItem>
                <SelectItem value="aarch64">ARM64</SelectItem>
                <SelectItem value="host">Host</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
