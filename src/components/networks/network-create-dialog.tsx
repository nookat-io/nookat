import { FormEvent, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { errorMessage } from '../../utils/error-message';
import { IpFamily } from '../../utils/ip-block';
import { createNetwork } from './network-actions-service';
import {
  AddressingFields,
  LabelFields,
  NEW_NETWORK_FORM,
  NetworkCreateField,
  NetworkCreateForm,
  driverAttachesToParentInterface,
  hasErrors,
  toNetworkCreateOptions,
  validateNetworkCreateForm,
} from './network-create-form';
import {
  AddressingFieldset,
  LabelRows,
  SwitchField,
  TextField,
} from './network-create-fields';
import { NetworkDriver } from './network-types';

const DRIVERS: { name: NetworkDriver; description: string }[] = [
  {
    name: 'bridge',
    description:
      'A private network on this engine. Containers reach the outside world through NAT.',
  },
  {
    name: 'macvlan',
    description:
      'Gives every container its own MAC and IP address on a host interface.',
  },
  {
    name: 'ipvlan',
    description:
      'Gives every container an IP address on a host interface, sharing its MAC address.',
  },
];

const FIELDS_OUTSIDE_ADVANCED: readonly string[] = ['name', 'parentInterface'];

const nextLabelId = (labels: LabelFields[]) =>
  labels.reduce((next, label) => Math.max(next, label.id + 1), 0);

interface NetworkCreateDialogProps {
  existingNetworkNames: readonly string[];
}

export function NetworkCreateDialog({
  existingNetworkNames,
}: NetworkCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<NetworkCreateForm>(NEW_NETWORK_FORM);
  const [visited, setVisited] = useState<ReadonlySet<NetworkCreateField>>(
    new Set()
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const errors = useMemo(
    () => validateNetworkCreateForm(form, existingNetworkNames),
    [form, existingNetworkNames]
  );
  const errorFor = (field: NetworkCreateField) =>
    isSubmitted || visited.has(field) ? errors[field] : undefined;
  const markVisited = (field: NetworkCreateField) =>
    setVisited(fields => new Set(fields).add(field));

  const update = (changes: Partial<NetworkCreateForm>) =>
    setForm(current => ({ ...current, ...changes }));
  const updateAddressing = (
    family: IpFamily,
    changes: Partial<AddressingFields>
  ) =>
    setForm(current => ({
      ...current,
      [family]: { ...current[family], ...changes },
    }));
  const updateLabel = (id: number, changes: Partial<LabelFields>) =>
    setForm(current => ({
      ...current,
      labels: current.labels.map(label =>
        label.id === id ? { ...label, ...changes } : label
      ),
    }));
  const addLabel = () =>
    setForm(current => ({
      ...current,
      labels: [
        ...current.labels,
        { id: nextLabelId(current.labels), key: '', value: '' },
      ],
    }));
  const removeLabel = (id: number) =>
    setForm(current => ({
      ...current,
      labels: current.labels.filter(label => label.id !== id),
    }));

  const startOver = () => {
    setForm(NEW_NETWORK_FORM);
    setVisited(new Set());
    setIsSubmitted(false);
    setShowAdvanced(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (isCreating) {
      return;
    }
    if (open) {
      startOver();
    }
    setIsOpen(open);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitted(true);
    if (hasErrors(errors)) {
      const advancedHasErrors = Object.keys(errors).some(
        field => !FIELDS_OUTSIDE_ADVANCED.includes(field)
      );
      setShowAdvanced(shown => shown || advancedHasErrors);
      return;
    }

    const options = toNetworkCreateOptions(form);
    setIsCreating(true);
    try {
      await createNetwork(options);
      toast.success(`Created network "${options.name}"`);
      setIsOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to create network'));
    } finally {
      setIsCreating(false);
    }
  };

  const driver = DRIVERS.find(({ name }) => name === form.driver);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Network
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Create Network</DialogTitle>
            <DialogDescription>
              Containers on the same network can reach each other by name.
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={isCreating} className="min-w-0 space-y-6">
            <div className="space-y-4">
              <TextField
                id="network-create-name"
                field="name"
                label="Name"
                placeholder="my-network"
                value={form.name}
                error={errorFor('name')}
                onChange={name => update({ name })}
                onBlur={() => markVisited('name')}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="network-create-driver">Driver</Label>
                  <Select
                    value={form.driver}
                    onValueChange={value =>
                      update({ driver: value as NetworkDriver })
                    }
                  >
                    <SelectTrigger id="network-create-driver">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DRIVERS.map(({ name }) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {driver?.description}
                  </p>
                </div>

                {driverAttachesToParentInterface(form.driver) && (
                  <TextField
                    id="network-create-parent-interface"
                    field="parentInterface"
                    label="Parent interface"
                    placeholder="eth0"
                    hint="The engine host's interface to attach to. Leave it empty for a network isolated from that LAN."
                    monospace
                    value={form.parentInterface}
                    error={errorFor('parentInterface')}
                    onChange={parentInterface => update({ parentInterface })}
                    onBlur={() => markVisited('parentInterface')}
                  />
                )}
              </div>

              <SwitchField
                id="network-create-internal"
                label="Internal"
                description="Containers can reach each other but not the outside world."
                checked={form.internal}
                onCheckedChange={internal => update({ internal })}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-expanded={showAdvanced}
                  aria-controls="network-create-advanced"
                  onClick={() => setShowAdvanced(shown => !shown)}
                  className="flex items-center gap-1 rounded-sm text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  {showAdvanced ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Advanced
                </button>
                <span className="text-sm text-muted-foreground">
                  IP addressing, attachable and labels
                </span>
              </div>

              {showAdvanced && (
                <div id="network-create-advanced" className="space-y-6">
                  <AddressingFieldset
                    family="ipv4"
                    fields={form.ipv4}
                    errorFor={errorFor}
                    onChange={changes => updateAddressing('ipv4', changes)}
                    onVisit={markVisited}
                  />
                  <AddressingFieldset
                    family="ipv6"
                    fields={form.ipv6}
                    errorFor={errorFor}
                    onChange={changes => updateAddressing('ipv6', changes)}
                    onVisit={markVisited}
                  />
                  {errorFor('addressFamilies') && (
                    <p className="text-sm text-destructive">
                      {errorFor('addressFamilies')}
                    </p>
                  )}
                  <SwitchField
                    id="network-create-attachable"
                    label="Attachable"
                    description="Lets standalone containers join a swarm-scoped network. Local networks accept containers either way."
                    checked={form.attachable}
                    onCheckedChange={attachable => update({ attachable })}
                  />
                  <LabelRows
                    labels={form.labels}
                    errorFor={errorFor}
                    onChange={updateLabel}
                    onAdd={addLabel}
                    onRemove={removeLabel}
                    onVisit={markVisited}
                  />
                </div>
              )}
            </div>
          </fieldset>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="min-w-[100px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
