import { useState } from 'react';
import { ClipboardPaste, Plus } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Textarea } from '../../../ui/textarea';
import { parseEnvFile } from '../env-file';
import { KeyValueEditor } from './key-value-editor';
import { StepProps } from './step-props';

function skippedLinesNote(lines: number[]): string | null {
  if (lines.length === 0) {
    return null;
  }
  const label = lines.length === 1 ? 'line' : 'lines';
  return `Skipped ${label} ${lines.join(', ')}: not a KEY=value pair.`;
}

export function EnvironmentStep({ form, issues, dispatch }: StepProps) {
  const [isPasting, setIsPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const [skippedNote, setSkippedNote] = useState<string | null>(null);

  const importPasted = () => {
    const { entries, skippedLines } = parseEnvFile(pasted);
    dispatch({ type: 'importEnv', entries });
    setSkippedNote(skippedLinesNote(skippedLines));
    setPasted('');
    setIsPasting(false);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="environment-heading">
        <div className="flex min-h-9 items-center justify-between gap-2">
          <h4 id="environment-heading" className="text-sm font-medium">
            Environment variables
          </h4>
          {!isPasting && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSkippedNote(null);
                setIsPasting(true);
              }}
            >
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Paste .env
            </Button>
          )}
        </div>

        {isPasting && (
          <div className="space-y-2 rounded-md border p-3">
            <Textarea
              aria-label="Pasted .env content"
              value={pasted}
              onChange={event => setPasted(event.target.value)}
              placeholder={'DATABASE_URL=postgres://db/app\nDEBUG=false'}
              className="min-h-28 font-mono text-xs"
              spellCheck={false}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPasted('');
                  setIsPasting(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={importPasted}
                disabled={!pasted.trim()}
              >
                Import variables
              </Button>
            </div>
          </div>
        )}
        {skippedNote && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {skippedNote}
          </p>
        )}

        <KeyValueEditor
          list="env"
          rows={form.env}
          errors={issues.errors}
          noun="Variable"
          keyName="name"
          keyPlaceholder="NAME"
          valuePlaceholder="value"
          dispatch={dispatch}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: 'addRow', list: 'env' })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add variable
        </Button>
      </section>

      <section className="space-y-3" aria-labelledby="labels-heading">
        <h4 id="labels-heading" className="text-sm font-medium">
          Labels
        </h4>
        <KeyValueEditor
          list="labels"
          rows={form.labels}
          errors={issues.errors}
          noun="Label"
          keyName="key"
          keyPlaceholder="com.example.team"
          valuePlaceholder="value"
          dispatch={dispatch}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: 'addRow', list: 'labels' })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add label
        </Button>
      </section>
    </div>
  );
}
