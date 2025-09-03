import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { RegistryState } from './types';

interface RegistrySelectorProps {
  registryState: RegistryState;
  onRegistryChange: (value: string) => void;
  onCustomRegistryChange: (value: string) => void;
  disabled?: boolean;
}

export function RegistrySelector({
  registryState,
  onRegistryChange,
  onCustomRegistryChange,
  disabled = false,
}: RegistrySelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="pull-registry">Registry</Label>
      <Select
        value={registryState.selectedRegistry}
        onValueChange={onRegistryChange}
        disabled={disabled}
      >
        <SelectTrigger id="pull-registry">
          <SelectValue placeholder="Select registry" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="docker.io">docker.io</SelectItem>
          <SelectItem value="custom">Add new registry</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom registry input */}
      {registryState.showCustomRegistry && (
        <Input
          id="pull-custom-registry"
          placeholder="Enter custom registry (e.g., gcr.io, ecr.aws.com)"
          value={registryState.customRegistry}
          onChange={e => onCustomRegistryChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
}
