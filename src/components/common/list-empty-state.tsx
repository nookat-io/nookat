import { ReactNode } from 'react';
import { LucideIcon, SearchX } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';
import { Button } from '../ui/button';
import { noMatchesTitle } from '../../utils/use-filter';

interface ListEmptyStateProps<F extends string> {
  hasItems: boolean;
  icon: LucideIcon;
  nothingExistsTitle: string;
  nothingExistsDescription: ReactNode;
  filterPhrases: Record<F, string>;
  filter: F;
  searchTerm: string;
  showAllLabel: string;
  onShowAll: () => void;
}

export function ListEmptyState<F extends string>({
  hasItems,
  icon,
  nothingExistsTitle,
  nothingExistsDescription,
  filterPhrases,
  filter,
  searchTerm,
  showAllLabel,
  onShowAll,
}: ListEmptyStateProps<F>) {
  if (!hasItems) {
    return (
      <EmptyState
        icon={icon}
        title={nothingExistsTitle}
        description={nothingExistsDescription}
      />
    );
  }

  return (
    <EmptyState
      icon={SearchX}
      title={noMatchesTitle(filterPhrases, filter, searchTerm)}
      action={
        <Button variant="outline" size="sm" onClick={onShowAll}>
          {showAllLabel}
        </Button>
      }
    />
  );
}

export function UiName({ children }: { children: ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

export function Command({ children }: { children: ReactNode }) {
  return <span className="font-mono">{children}</span>;
}
