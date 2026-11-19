import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId } from 'react';
import { CollapsibleSectionProps } from './types';

export const CollapsibleSection = ({
  title,
  children,
  isOpen,
  onToggle,
}: CollapsibleSectionProps) => {
  const contentId = useId();
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  return (
    <Card>
      <CardHeader className="p-0">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={onToggle}
          className="flex w-full items-center justify-between rounded-lg p-6 text-left transition-colors hover:bg-accent/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <CardTitle>{title}</CardTitle>
          <Chevron
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      </CardHeader>
      {isOpen && <CardContent id={contentId}>{children}</CardContent>}
    </Card>
  );
};
