import { useState } from 'react';
import { Check, Download, Loader2, Search } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { cn } from '../../../../lib/utils';
import { formatBytes } from '../../../../utils/format';
import { normalizeImageReference, pullTarget } from '../image-reference';
import { ImageChoice } from '../use-create-container-wizard';
import { StepProps } from './step-props';

interface ImageStepProps extends StepProps {
  choices: ImageChoice[];
  pulling: string | null;
  onPull: (reference: string) => void;
}

function matches(choice: ImageChoice, query: string, normalized: string) {
  return (
    choice.reference.toLowerCase().includes(query.toLowerCase()) ||
    choice.reference === normalized
  );
}

export function ImageStep({
  form,
  issues,
  dispatch,
  choices,
  pulling,
  onPull,
}: ImageStepProps) {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const normalized = normalizeImageReference(query);
  const visible = choices.filter(choice =>
    matches(choice, trimmedQuery, normalized)
  );
  const isLocal = choices.some(choice => choice.reference === normalized);
  const canPull =
    normalized !== '' &&
    !isLocal &&
    !/\s/.test(trimmedQuery) &&
    pullTarget(normalized) !== null;
  const imageError = form.image ? issues.errors.image : undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="image-search">Image</Label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            id="image-search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search local images or type a reference like nginx:1.27"
            className="pl-10"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </div>
      </div>

      {canPull && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-dashed p-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-foreground">{normalized}</span> is
            not on this machine yet.
          </p>
          <Button
            size="sm"
            onClick={() => onPull(normalized)}
            disabled={pulling !== null}
          >
            {pulling === normalized ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {pulling === normalized ? 'Pulling...' : `Pull ${normalized}`}
          </Button>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="shrink-0 text-muted-foreground">
          {form.image ? 'Selected image' : 'No image selected yet'}
        </span>
        {form.image && (
          <span className="min-w-0 truncate font-mono" title={form.image}>
            {form.image}
          </span>
        )}
      </div>
      {imageError && <p className="text-xs text-destructive">{imageError}</p>}

      {visible.length > 0 ? (
        <ul
          aria-label="Local images"
          className="max-h-72 divide-y overflow-y-auto rounded-md border"
        >
          {visible.map(choice => {
            const selected = choice.reference === form.image;
            return (
              <li key={choice.reference}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    dispatch({
                      type: 'set',
                      field: 'image',
                      value: choice.reference,
                    })
                  }
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-hidden',
                    selected && 'bg-accent'
                  )}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0 text-primary',
                      !selected && 'invisible'
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {choice.reference}
                  </span>
                  {choice.size !== null && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(choice.size)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {choices.length === 0
            ? 'There are no local images yet. Type a reference above to pull one.'
            : `No local image matches "${trimmedQuery}".`}
        </p>
      )}
    </div>
  );
}
