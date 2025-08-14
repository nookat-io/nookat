import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { LoadingSpinner } from '../ui/loading-spinner';

export interface VmConfig {
  cpu_cores: number;
  memory_gb: number;
  disk_gb: number;
  architecture: string;
}

interface VmResourceConfigProps {
  config: VmConfig;
  onConfigChange: (config: VmConfig) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function VmResourceConfig({
  config,
  onConfigChange,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Start VM',
}: VmResourceConfigProps) {
  const handleConfigChange = (
    field: keyof VmConfig,
    value: string | number
  ) => {
    onConfigChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>VM Configuration</CardTitle>
        <CardDescription>
          Configure resources for your Colima VM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpu-cores">CPU Cores</Label>
            <Input
              id="cpu-cores"
              type="number"
              min="1"
              max="16"
              value={config.cpu_cores}
              onChange={e =>
                handleConfigChange('cpu_cores', parseInt(e.target.value) || 1)
              }
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 2-4 cores for development
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="memory-gb">Memory (GB)</Label>
            <Input
              id="memory-gb"
              type="number"
              min="2"
              max="32"
              value={config.memory_gb}
              onChange={e =>
                handleConfigChange('memory_gb', parseInt(e.target.value) || 2)
              }
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 4-8 GB for development
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="disk-gb">Disk Size (GB)</Label>
            <Input
              id="disk-gb"
              type="number"
              min="10"
              max="100"
              value={config.disk_gb}
              onChange={e =>
                handleConfigChange('disk_gb', parseInt(e.target.value) || 10)
              }
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 20-50 GB for development
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="architecture">Architecture</Label>
            <Select
              value={config.architecture}
              onValueChange={value => handleConfigChange('architecture', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect (Recommended)</SelectItem>
                <SelectItem value="arm64">ARM64 (Apple Silicon)</SelectItem>
                <SelectItem value="x86_64">x86_64 (Intel)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto-detect will choose the best option for your system
            </p>
          </div>
        </div>
        <Button onClick={onSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Starting VM...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
