import { Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { cn } from '../../lib/utils';
import { IpFamily } from '../../utils/ip-block';
import {
  AddressingField,
  AddressingFields,
  LabelFields,
  NetworkCreateField,
} from './network-create-form';

type ErrorFor = (field: NetworkCreateField) => string | undefined;

const messageId = (field: NetworkCreateField) =>
  `network-create-${field.replace('.', '-')}-message`;

function FieldMessage({
  field,
  message,
}: {
  field: NetworkCreateField;
  message?: string;
}) {
  if (!message) {
    return null;
  }
  return (
    <p id={messageId(field)} className="text-sm text-destructive">
      {message}
    </p>
  );
}

interface FieldInputProps {
  id: string;
  field: NetworkCreateField;
  value: string;
  error?: string;
  placeholder?: string;
  ariaLabel?: string;
  monospace?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function FieldInput({
  id,
  field,
  value,
  error,
  placeholder,
  ariaLabel,
  monospace = false,
  onChange,
  onBlur,
}: FieldInputProps) {
  return (
    <Input
      id={id}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? messageId(field) : undefined}
      spellCheck={false}
      autoComplete="off"
      className={cn(
        monospace && 'font-mono',
        error && 'border-destructive focus-visible:ring-destructive'
      )}
      onChange={event => onChange(event.target.value)}
      onBlur={onBlur}
    />
  );
}

interface TextFieldProps extends Omit<FieldInputProps, 'ariaLabel'> {
  label: string;
  hint?: string;
}

export function TextField({ label, hint, ...input }: TextFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={input.id}>{label}</Label>
      <FieldInput {...input} />
      <FieldMessage field={input.field} message={input.error} />
      {hint && !input.error && (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

interface SwitchFieldProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: SwitchFieldProps) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

const FAMILY_LABEL: Record<IpFamily, string> = { ipv4: 'IPv4', ipv6: 'IPv6' };

const ADDRESSING_INPUTS: {
  field: AddressingField;
  label: string;
  placeholder: Record<IpFamily, string>;
}[] = [
  {
    field: 'subnet',
    label: 'Subnet',
    placeholder: { ipv4: '172.20.0.0/16', ipv6: 'fd00:1::/64' },
  },
  {
    field: 'gateway',
    label: 'Gateway',
    placeholder: { ipv4: '172.20.0.1', ipv6: 'fd00:1::1' },
  },
  {
    field: 'ipRange',
    label: 'IP range',
    placeholder: { ipv4: '172.20.10.0/24', ipv6: 'fd00:1::/80' },
  },
];

interface AddressingFieldsetProps {
  family: IpFamily;
  fields: AddressingFields;
  errorFor: ErrorFor;
  onChange: (changes: Partial<AddressingFields>) => void;
  onVisit: (field: NetworkCreateField) => void;
}

export function AddressingFieldset({
  family,
  fields,
  errorFor,
  onChange,
  onVisit,
}: AddressingFieldsetProps) {
  const familyLabel = FAMILY_LABEL[family];
  const inputs = ADDRESSING_INPUTS.map(input => ({
    ...input,
    key: `${family}.${input.field}` as const,
  }));

  return (
    <div
      role="group"
      aria-label={`${familyLabel} addressing`}
      className="space-y-3"
    >
      <SwitchField
        id={`network-create-${family}`}
        label={familyLabel}
        description={`Give containers ${familyLabel} addresses. Leave the fields empty to let Docker choose them.`}
        checked={fields.enabled}
        onCheckedChange={enabled => {
          onChange({ enabled });
          onVisit('addressFamilies');
        }}
      />
      {fields.enabled && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {inputs.map(input => (
              <div key={input.key} className="space-y-2">
                <Label htmlFor={`network-create-${family}-${input.field}`}>
                  {input.label}
                </Label>
                <FieldInput
                  id={`network-create-${family}-${input.field}`}
                  field={input.key}
                  value={fields[input.field]}
                  error={errorFor(input.key)}
                  placeholder={input.placeholder[family]}
                  monospace
                  onChange={value => onChange({ [input.field]: value })}
                  onBlur={() => onVisit(input.key)}
                />
              </div>
            ))}
          </div>
          {inputs.map(input => (
            <FieldMessage
              key={input.key}
              field={input.key}
              message={errorFor(input.key)}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface LabelRowsProps {
  labels: LabelFields[];
  errorFor: ErrorFor;
  onChange: (id: number, changes: Partial<LabelFields>) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  onVisit: (field: NetworkCreateField) => void;
}

export function LabelRows({
  labels,
  errorFor,
  onChange,
  onAdd,
  onRemove,
  onVisit,
}: LabelRowsProps) {
  return (
    <div
      role="group"
      aria-labelledby="network-create-labels"
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-1">
          <h3
            id="network-create-labels"
            className="text-sm font-medium leading-none"
          >
            Labels
          </h3>
          <p className="text-sm text-muted-foreground">
            Metadata for tools and scripts, like com.example.team=payments.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add label
        </Button>
      </div>
      {labels.map(label => {
        const field = `label.${label.id}` as const;
        const error = errorFor(field);
        return (
          <div key={label.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <FieldInput
                id={`network-create-label-${label.id}-key`}
                field={field}
                value={label.key}
                error={error}
                placeholder="key"
                ariaLabel="Label key"
                monospace
                onChange={key => onChange(label.id, { key })}
                onBlur={() => onVisit(field)}
              />
              <FieldInput
                id={`network-create-label-${label.id}-value`}
                field={field}
                value={label.value}
                placeholder="value"
                ariaLabel="Label value"
                monospace
                onChange={value => onChange(label.id, { value })}
                onBlur={() => onVisit(field)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Remove label"
                onClick={() => onRemove(label.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <FieldMessage field={field} message={error} />
          </div>
        );
      })}
    </div>
  );
}
