import { Database, FolderOpen, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Checkbox } from '../../../ui/checkbox';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { cn } from '../../../../lib/utils';
import { StorageMountKind } from '../create-container-types';
import { fieldAria } from '../field-aria';
import { MountRow } from '../wizard-state';
import { rowField } from '../wizard-validation';
import { WizardField } from '../wizard-field';
import { StepProps } from './step-props';

const VOLUME_SUGGESTIONS_ID = 'wizard-existing-volumes';

const KINDS: { kind: StorageMountKind; label: string }[] = [
  { kind: 'volume', label: 'Volume' },
  { kind: 'bind', label: 'Bind mount' },
];

interface StorageStepProps extends StepProps {
  volumes: string[];
}

function volumeHint(row: MountRow, volumes: string[]) {
  const name = row.source.trim();
  if (!name) {
    return 'Pick an existing volume or name a new one.';
  }
  return volumes.includes(name)
    ? 'Existing volume.'
    : 'New volume. Docker creates it with the container.';
}

export function StorageStep({
  form,
  issues,
  dispatch,
  volumes,
}: StorageStepProps) {
  const { errors } = issues;

  return (
    <div className="space-y-4">
      <datalist id={VOLUME_SUGGESTIONS_ID}>
        {volumes.map(volume => (
          <option key={volume} value={volume} />
        ))}
      </datalist>

      {form.mounts.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing is mounted. Data written inside the container is lost when it
          is removed.
        </p>
      )}

      {form.mounts.map((row, index) => {
        const number = index + 1;
        const field = (name: string) => rowField('mounts', row.id, name);
        const sourceId = field('source');
        const targetId = field('target');
        const readOnlyId = field('readOnly');
        const update = (patch: Partial<typeof row>) =>
          dispatch({ type: 'updateRow', list: 'mounts', id: row.id, patch });

        return (
          <fieldset key={row.id} className="space-y-3 rounded-md border p-3">
            <legend className="sr-only">Mount {number}</legend>
            <div className="flex items-center justify-between gap-2">
              <div
                role="group"
                aria-label={`Mount ${number} type`}
                className="inline-flex rounded-md border p-0.5"
              >
                {KINDS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={row.kind === kind}
                    onClick={() => update({ kind })}
                    className={cn(
                      'rounded-sm px-3 py-1 text-xs font-medium transition-colors',
                      row.kind === kind
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={readOnlyId}
                    checked={row.readOnly}
                    onCheckedChange={checked =>
                      update({ readOnly: checked === true })
                    }
                  />
                  <Label htmlFor={readOnlyId} className="text-xs">
                    Read-only
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove mount ${number}`}
                  onClick={() =>
                    dispatch({ type: 'removeRow', list: 'mounts', id: row.id })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {row.kind === 'volume' ? (
                <WizardField
                  id={sourceId}
                  label={`Volume ${number}`}
                  error={errors[sourceId]}
                  hint={volumeHint(row, volumes)}
                >
                  <Input
                    id={sourceId}
                    list={VOLUME_SUGGESTIONS_ID}
                    value={row.source}
                    onChange={event => update({ source: event.target.value })}
                    placeholder="app-data"
                    autoComplete="off"
                    spellCheck={false}
                    {...fieldAria(sourceId, errors[sourceId])}
                  />
                </WizardField>
              ) : (
                <WizardField
                  id={sourceId}
                  label={`Host path ${number}`}
                  error={errors[sourceId]}
                  hint="A folder or file on this machine."
                >
                  <Input
                    id={sourceId}
                    value={row.source}
                    onChange={event => update({ source: event.target.value })}
                    placeholder="/Users/me/project"
                    className="font-mono"
                    autoComplete="off"
                    spellCheck={false}
                    {...fieldAria(sourceId, errors[sourceId])}
                  />
                </WizardField>
              )}

              <WizardField
                id={targetId}
                label={`Container path ${number}`}
                error={errors[targetId]}
              >
                <Input
                  id={targetId}
                  value={row.target}
                  onChange={event => update({ target: event.target.value })}
                  placeholder="/data"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                  {...fieldAria(targetId, errors[targetId])}
                />
              </WizardField>
            </div>
          </fieldset>
        );
      })}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            dispatch({
              type: 'addRow',
              list: 'mounts',
              fields: { kind: 'volume' },
            })
          }
        >
          <Database className="mr-2 h-4 w-4" />
          Add volume
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            dispatch({
              type: 'addRow',
              list: 'mounts',
              fields: { kind: 'bind' },
            })
          }
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Add bind mount
        </Button>
      </div>
    </div>
  );
}
