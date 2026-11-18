import { Input } from '../../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import { fieldAria } from '../field-aria';
import { MemoryUnit } from '../wizard-state';
import { WizardField } from '../wizard-field';
import {
  DEFAULT_NETWORK_LABEL,
  MEMORY_UNITS,
  networkLabel,
} from '../wizard-options';
import { StepProps } from './step-props';

const DEFAULT_NETWORK_VALUE = 'default';
const NAMED_NETWORK_PREFIX = 'network:';

interface NetworkStepProps extends StepProps {
  networks: string[];
}

const selectValue = (network: string) =>
  network ? `${NAMED_NETWORK_PREFIX}${network}` : DEFAULT_NETWORK_VALUE;

const networkFromSelect = (value: string) =>
  value.startsWith(NAMED_NETWORK_PREFIX)
    ? value.slice(NAMED_NETWORK_PREFIX.length)
    : '';

export function NetworkStep({
  form,
  issues,
  dispatch,
  networks,
}: NetworkStepProps) {
  const { errors } = issues;
  const choices = networks.filter(network => network !== 'bridge');

  return (
    <div className="space-y-5">
      <WizardField
        id="container-network"
        label="Network"
        error={errors.network}
        hint="Containers on the same user-defined network reach each other by name."
      >
        <Select
          value={selectValue(form.network)}
          onValueChange={value =>
            dispatch({
              type: 'set',
              field: 'network',
              value: networkFromSelect(value),
            })
          }
        >
          <SelectTrigger
            id="container-network"
            {...fieldAria('container-network', errors.network)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_NETWORK_VALUE}>
              {DEFAULT_NETWORK_LABEL}
            </SelectItem>
            {choices.map(network => (
              <SelectItem key={network} value={selectValue(network)}>
                {networkLabel(network)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </WizardField>

      <div className="grid grid-cols-2 gap-4">
        <WizardField
          id="container-cpus"
          label="CPU limit"
          error={errors.cpus}
          hint="In CPUs, for example 0.5 or 2. Empty means no limit."
        >
          <Input
            id="container-cpus"
            value={form.cpus}
            onChange={event =>
              dispatch({
                type: 'set',
                field: 'cpus',
                value: event.target.value,
              })
            }
            placeholder="No limit"
            inputMode="decimal"
            {...fieldAria('container-cpus', errors.cpus)}
          />
        </WizardField>

        <WizardField
          id="container-memory"
          label="Memory limit"
          error={errors.memory}
          hint="Empty means no limit."
        >
          <div className="flex gap-2">
            <Input
              id="container-memory"
              value={form.memory}
              onChange={event =>
                dispatch({
                  type: 'set',
                  field: 'memory',
                  value: event.target.value,
                })
              }
              placeholder="No limit"
              inputMode="decimal"
              {...fieldAria('container-memory', errors.memory)}
            />
            <Select
              value={form.memoryUnit}
              onValueChange={value => {
                const unit = MEMORY_UNITS.find(
                  (candidate): candidate is MemoryUnit => candidate === value
                );
                if (unit) {
                  dispatch({ type: 'set', field: 'memoryUnit', value: unit });
                }
              }}
            >
              <SelectTrigger aria-label="Memory unit" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEMORY_UNITS.map(unit => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </WizardField>
      </div>
    </div>
  );
}
