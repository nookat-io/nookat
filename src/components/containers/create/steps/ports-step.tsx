import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import { PORT_PROTOCOLS } from '../create-container-types';
import { rowField } from '../wizard-validation';
import { StepProps } from './step-props';

const COLUMNS =
  'grid grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)_minmax(0,1.3fr)_2.5rem] items-center gap-2';

const PORT_FIELDS = ['containerPort', 'hostPort', 'hostIp'];

export function PortsStep({ form, issues, dispatch }: StepProps) {
  const { errors, warnings } = issues;

  return (
    <div className="space-y-4">
      {form.ports.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No ports are published. Other containers on the same network can still
          reach this one.
        </p>
      ) : (
        <div className="space-y-3">
          <div
            className={`${COLUMNS} text-xs font-medium text-muted-foreground`}
            aria-hidden
          >
            <span>Container port</span>
            <span>Protocol</span>
            <span>Host port</span>
            <span>Host IP</span>
            <span />
          </div>
          {form.ports.map((row, index) => {
            const number = index + 1;
            const field = (name: string) => rowField('ports', row.id, name);
            const rowErrors = PORT_FIELDS.map(name => errors[field(name)]);
            const rowWarning = warnings[field('hostPort')];
            const update = (patch: Partial<typeof row>) =>
              dispatch({ type: 'updateRow', list: 'ports', id: row.id, patch });

            return (
              <div key={row.id} className="space-y-1">
                <div className={COLUMNS}>
                  <Input
                    aria-label={`Container port ${number}`}
                    aria-invalid={
                      errors[field('containerPort')] ? true : undefined
                    }
                    value={row.containerPort}
                    onChange={event =>
                      update({ containerPort: event.target.value })
                    }
                    placeholder="80"
                    inputMode="numeric"
                  />
                  <Select
                    value={row.protocol}
                    onValueChange={value => {
                      const protocol = PORT_PROTOCOLS.find(
                        candidate => candidate === value
                      );
                      if (protocol) {
                        update({ protocol });
                      }
                    }}
                  >
                    <SelectTrigger aria-label={`Protocol ${number}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PORT_PROTOCOLS.map(protocol => (
                        <SelectItem key={protocol} value={protocol}>
                          {protocol.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label={`Host port ${number}`}
                    aria-invalid={errors[field('hostPort')] ? true : undefined}
                    value={row.hostPort}
                    onChange={event => update({ hostPort: event.target.value })}
                    placeholder="Random"
                    inputMode="numeric"
                  />
                  <Input
                    aria-label={`Host IP ${number}`}
                    aria-invalid={errors[field('hostIp')] ? true : undefined}
                    value={row.hostIp}
                    onChange={event => update({ hostIp: event.target.value })}
                    placeholder="All interfaces"
                    spellCheck={false}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove port mapping ${number}`}
                    onClick={() =>
                      dispatch({ type: 'removeRow', list: 'ports', id: row.id })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {rowErrors
                  .filter(error => error !== undefined)
                  .map(error => (
                    <p key={error} className="text-xs text-destructive">
                      {error}
                    </p>
                  ))}
                {rowWarning && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {rowWarning}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => dispatch({ type: 'addRow', list: 'ports' })}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add port
      </Button>
    </div>
  );
}
