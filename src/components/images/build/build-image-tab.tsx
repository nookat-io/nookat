import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { BuildFormData } from '../common/types';

interface BuildImageTabProps {
  buildData: BuildFormData;
  onBuildDataChange: (updates: Partial<BuildFormData>) => void;
  disabled?: boolean;
}

export function BuildImageTab({
  buildData,
  onBuildDataChange,
  disabled = false,
}: BuildImageTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="build-dockerfile">Dockerfile Path</Label>
          <Input
            id="build-dockerfile"
            placeholder="e.g., ./Dockerfile"
            value={buildData.dockerfilePath}
            onChange={e =>
              onBuildDataChange({ dockerfilePath: e.target.value })
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="build-context">Build Context</Label>
          <Input
            id="build-context"
            placeholder="e.g., ."
            value={buildData.buildContext}
            onChange={e =>
              onBuildDataChange({ buildContext: e.target.value })
            }
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="build-image-name">Image Name</Label>
          <Input
            id="build-image-name"
            placeholder="e.g., myapp"
            value={buildData.imageName}
            onChange={e =>
              onBuildDataChange({ imageName: e.target.value })
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="build-tag">Tag</Label>
          <Input
            id="build-tag"
            placeholder="latest"
            value={buildData.tag}
            onChange={e =>
              onBuildDataChange({ tag: e.target.value })
            }
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="build-args">
          Build Arguments (key=value, one per line)
        </Label>
        <Textarea
          id="build-args"
          placeholder="VERSION=1.0.0&#10;ENVIRONMENT=production"
          value={buildData.buildArgs}
          onChange={e =>
            onBuildDataChange({ buildArgs: e.target.value })
          }
          disabled={disabled}
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="no-cache"
            checked={buildData.noCache}
            onCheckedChange={checked =>
              onBuildDataChange({ noCache: checked })
            }
            disabled={disabled}
          />
          <Label htmlFor="no-cache">No Cache</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="pull"
            checked={buildData.pull}
            onCheckedChange={checked =>
              onBuildDataChange({ pull: checked })
            }
            disabled={disabled}
          />
          <Label htmlFor="pull">Pull Base Images</Label>
        </div>
      </div>
    </div>
  );
}
