import { Check, CircleAlert } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { StepId, WIZARD_STEPS } from './wizard-state';

interface WizardStepperProps {
  current: StepId;
  invalid: StepId[];
  canVisit: (step: StepId) => boolean;
  onSelect: (step: StepId) => void;
  disabled: boolean;
}

export function WizardStepper({
  current,
  invalid,
  canVisit,
  onSelect,
  disabled,
}: WizardStepperProps) {
  const currentIndex = WIZARD_STEPS.findIndex(step => step.id === current);

  return (
    <nav aria-label="Wizard steps">
      <ol className="space-y-1">
        {WIZARD_STEPS.map((step, index) => {
          const isCurrent = step.id === current;
          const isPast = index < currentIndex;
          const isInvalid = isPast && invalid.includes(step.id);
          const isDone = isPast && !isInvalid;

          return (
            <li key={step.id}>
              <button
                type="button"
                aria-current={isCurrent ? 'step' : undefined}
                disabled={disabled || !canVisit(step.id)}
                onClick={() => onSelect(step.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                  isCurrent
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
                    isCurrent &&
                      'border-primary bg-primary text-primary-foreground',
                    isDone && 'border-primary text-primary',
                    isInvalid && 'border-destructive text-destructive'
                  )}
                >
                  {isDone && <Check className="h-3.5 w-3.5" />}
                  {isInvalid && <CircleAlert className="h-3.5 w-3.5" />}
                  {!isDone && !isInvalid && index + 1}
                </span>
                {step.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
