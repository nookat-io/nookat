import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import { Switch } from '../../../ui/switch';
import { fieldAria, messageId } from '../field-aria';
import { splitShellWords } from '../shell-words';
import { FieldMessage, WizardField } from '../wizard-field';
import { RESTART_POLICIES } from '../wizard-options';
import { StepProps } from './step-props';

function CommandPreview({ command }: { command: string }) {
  const parsed = splitShellWords(command);
  if (!('words' in parsed) || parsed.words.length === 0) {
    return 'Leave empty to run the image default command.';
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      Runs as
      {parsed.words.map((word, index) => (
        <code
          key={index}
          className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-foreground"
        >
          {word || '""'}
        </code>
      ))}
    </span>
  );
}

export function GeneralStep({ form, issues, dispatch }: StepProps) {
  const { errors } = issues;

  return (
    <div className="space-y-5">
      <WizardField
        id="container-name"
        label="Name"
        error={errors.name}
        hint="Leave empty and Docker picks a random name."
      >
        <Input
          id="container-name"
          value={form.name}
          onChange={event =>
            dispatch({ type: 'set', field: 'name', value: event.target.value })
          }
          placeholder="my-container"
          autoComplete="off"
          spellCheck={false}
          {...fieldAria('container-name', errors.name)}
        />
      </WizardField>

      <WizardField
        id="container-command"
        label="Command"
        error={errors.command}
        hint={<CommandPreview command={form.command} />}
      >
        <Input
          id="container-command"
          value={form.command}
          onChange={event =>
            dispatch({
              type: 'set',
              field: 'command',
              value: event.target.value,
            })
          }
          placeholder="Image default"
          className="font-mono"
          autoComplete="off"
          spellCheck={false}
          {...fieldAria('container-command', errors.command)}
        />
      </WizardField>

      <div className="grid grid-cols-2 gap-4">
        <WizardField
          id="container-entrypoint"
          label="Entrypoint"
          hint="One executable, like docker run --entrypoint."
        >
          <Input
            id="container-entrypoint"
            value={form.entrypoint}
            onChange={event =>
              dispatch({
                type: 'set',
                field: 'entrypoint',
                value: event.target.value,
              })
            }
            placeholder="Image default"
            className="font-mono"
            autoComplete="off"
            spellCheck={false}
            {...fieldAria('container-entrypoint')}
          />
        </WizardField>

        <WizardField
          id="container-working-dir"
          label="Working directory"
          error={errors.workingDir}
        >
          <Input
            id="container-working-dir"
            value={form.workingDir}
            onChange={event =>
              dispatch({
                type: 'set',
                field: 'workingDir',
                value: event.target.value,
              })
            }
            placeholder="Image default"
            className="font-mono"
            autoComplete="off"
            spellCheck={false}
            {...fieldAria('container-working-dir', errors.workingDir)}
          />
        </WizardField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <WizardField id="restart-policy" label="Restart policy">
          <Select
            value={form.restartPolicy}
            onValueChange={value => {
              const policy = RESTART_POLICIES.find(
                option => option.value === value
              );
              if (policy) {
                dispatch({
                  type: 'set',
                  field: 'restartPolicy',
                  value: policy.value,
                });
              }
            }}
          >
            <SelectTrigger id="restart-policy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESTART_POLICIES.map(policy => (
                <SelectItem key={policy.value} value={policy.value}>
                  {policy.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </WizardField>

        {form.restartPolicy === 'on-failure' && (
          <WizardField
            id="max-retries"
            label="Maximum retries"
            error={errors.maxRetries}
          >
            <Input
              id="max-retries"
              value={form.maxRetries}
              onChange={event =>
                dispatch({
                  type: 'set',
                  field: 'maxRetries',
                  value: event.target.value,
                })
              }
              placeholder="No limit"
              inputMode="numeric"
              {...fieldAria('max-retries', errors.maxRetries)}
            />
          </WizardField>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="auto-remove">Remove when it exits</Label>
            <p className="text-xs text-muted-foreground">
              Docker deletes the container as soon as it stops, like docker run
              --rm.
            </p>
          </div>
          <Switch
            id="auto-remove"
            checked={form.autoRemove}
            onCheckedChange={checked =>
              dispatch({ type: 'set', field: 'autoRemove', value: checked })
            }
            {...fieldAria('auto-remove', errors.autoRemove)}
          />
        </div>
        <FieldMessage id={messageId('auto-remove')} error={errors.autoRemove} />
      </div>
    </div>
  );
}
