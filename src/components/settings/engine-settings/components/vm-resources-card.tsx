import { Label } from '../../../ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import { Separator } from '../../../ui/separator';
import { Switch } from '../../../ui/switch';
import { Settings } from 'lucide-react';
import {
  ChangeColimaVmSetting,
  ColimaArchitecture,
  ColimaProfile,
  ColimaVm,
  ColimaVmSettingsChanges,
} from '../types';
import { ResourceInput } from './resource-input';
import { PerformanceWarnings } from './performance-warnings';

const MINIMUM_MEMORY_GIB = 2;
const MINIMUM_DISK_GIB = 20;
const MAXIMUM_DISK_GIB = 1000;

const ARCHITECTURE_LABELS: Record<ColimaArchitecture, string> = {
  aarch64: 'ARM64',
  x86_64: 'x86_64',
};

const ARCHITECTURES: ColimaArchitecture[] = ['aarch64', 'x86_64'];

interface VmResourcesCardProps {
  vm: ColimaVm;
  changes: ColimaVmSettingsChanges;
  onChangeSetting: ChangeColimaVmSetting;
  isEngineRunning: boolean;
  isBusy: boolean;
}

function profileDescription(profile: ColimaProfile, isEngineRunning: boolean) {
  const name = `Colima profile "${profile.name}"`;
  if (isEngineRunning) {
    return `${name} is running. Stop the engine to change its resources.`;
  }
  if (profile.status === 'Missing') {
    return `${name} does not exist yet. Start the engine to create it with these resources.`;
  }
  return `${name} is stopped. Changes apply when the engine starts.`;
}

export function VmResourcesCard({
  vm,
  changes,
  onChangeSetting,
  isEngineRunning,
  isBusy,
}: VmResourcesCardProps) {
  const { profile, host } = vm;
  const settings = { ...profile.settings, ...changes };
  const profileExists = profile.status !== 'Missing';
  const isLocked = isEngineRunning || isBusy;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          VM Resources
        </CardTitle>
        <CardDescription>
          {profileDescription(profile, isEngineRunning)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PerformanceWarnings warnings={vm.warnings} host={host} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResourceInput
            id="cpu"
            label="CPU Cores"
            value={settings.cpus}
            min={1}
            max={host.cpus}
            onChange={value => onChangeSetting('cpus', value)}
            disabled={isLocked}
          />

          <ResourceInput
            id="memory"
            label="Memory (GB)"
            value={settings.memory_gib}
            min={MINIMUM_MEMORY_GIB}
            max={Math.floor(host.memory_gib)}
            onChange={value => onChangeSetting('memory_gib', value)}
            disabled={isLocked}
          />

          <ResourceInput
            id="disk"
            label="Disk (GB)"
            value={settings.disk_gib}
            min={profileExists ? profile.settings.disk_gib : MINIMUM_DISK_GIB}
            max={Math.max(MAXIMUM_DISK_GIB, profile.settings.disk_gib)}
            onChange={value => onChangeSetting('disk_gib', value)}
            disabled={isLocked}
          />

          <div className="space-y-2">
            <Label htmlFor="architecture">Architecture</Label>
            <Select
              value={settings.architecture}
              onValueChange={value => {
                const architecture = ARCHITECTURES.find(arch => arch === value);
                if (architecture) {
                  onChangeSetting('architecture', architecture);
                }
              }}
              disabled={isLocked || profileExists}
            >
              <SelectTrigger id="architecture">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARCHITECTURES.map(architecture => (
                  <SelectItem key={architecture} value={architecture}>
                    {ARCHITECTURE_LABELS[architecture]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="mount-inotify">
              Propagate file changes (hot reload)
            </Label>
            <div className="text-sm text-muted-foreground">
              Lets file watchers in containers, such as Vite, webpack or
              nodemon, see edits made on your Mac. Bulk writes to mounted
              folders get about 20% slower.
            </div>
          </div>
          <Switch
            id="mount-inotify"
            checked={settings.mount_inotify}
            onCheckedChange={checked =>
              onChangeSetting('mount_inotify', checked)
            }
            disabled={isLocked}
          />
        </div>
      </CardContent>
    </Card>
  );
}
