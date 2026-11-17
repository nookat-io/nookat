import { Dispatch } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { KeyValueRow, WizardAction } from '../wizard-state';
import { rowField } from '../wizard-validation';

interface KeyValueEditorProps {
  list: 'env' | 'labels';
  rows: KeyValueRow[];
  errors: Record<string, string>;
  noun: string;
  keyName: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  dispatch: Dispatch<WizardAction>;
}

export function KeyValueEditor({
  list,
  rows,
  errors,
  noun,
  keyName,
  keyPlaceholder,
  valuePlaceholder,
  dispatch,
}: KeyValueEditorProps) {
  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const number = index + 1;
        const keyError = errors[rowField(list, row.id, 'key')];
        const update = (patch: Partial<Omit<KeyValueRow, 'id'>>) =>
          dispatch({ type: 'updateRow', list, id: row.id, patch });

        return (
          <div key={row.id} className="space-y-1">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.5fr)_2.5rem] items-center gap-2">
              <Input
                aria-label={`${noun} ${number} ${keyName}`}
                aria-invalid={keyError ? true : undefined}
                value={row.key}
                onChange={event => update({ key: event.target.value })}
                placeholder={keyPlaceholder}
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="text-muted-foreground" aria-hidden>
                =
              </span>
              <Input
                aria-label={`${noun} ${number} value`}
                value={row.value}
                onChange={event => update({ value: event.target.value })}
                placeholder={valuePlaceholder}
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${noun.toLowerCase()} ${number}`}
                onClick={() =>
                  dispatch({ type: 'removeRow', list, id: row.id })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {keyError && <p className="text-xs text-destructive">{keyError}</p>}
          </div>
        );
      })}
    </div>
  );
}
