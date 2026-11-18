import { ReactNode } from 'react';
import { Label } from '../../ui/label';
import { messageId } from './field-aria';

interface FieldMessageProps {
  id: string;
  error?: string;
  warning?: string;
  hint?: ReactNode;
}

export function FieldMessage({ id, error, warning, hint }: FieldMessageProps) {
  if (error) {
    return (
      <p id={id} className="text-xs text-destructive">
        {error}
      </p>
    );
  }
  if (warning) {
    return (
      <p id={id} className="text-xs text-amber-600 dark:text-amber-400">
        {warning}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="text-xs text-muted-foreground">
        {hint}
      </p>
    );
  }
  return null;
}

interface WizardFieldProps {
  id: string;
  label: string;
  error?: string;
  warning?: string;
  hint?: ReactNode;
  children: ReactNode;
}

export function WizardField({
  id,
  label,
  error,
  warning,
  hint,
  children,
}: WizardFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldMessage
        id={messageId(id)}
        error={error}
        warning={warning}
        hint={hint}
      />
    </div>
  );
}
