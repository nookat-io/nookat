import { TableHead } from './table';
import { cn } from '../../lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortableTableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  onSort: (key: string) => void;
  className?: string;
  sortable?: boolean;
}

export function SortableTableHeader({
  children,
  sortKey,
  onSort,
  className,
  sortable = true,
}: SortableTableHeaderProps) {
  const isSortable =
    sortable && sortKey !== 'actions' && sortKey !== 'checkbox';

  const handleClick = () => {
    if (isSortable) {
      onSort(sortKey);
    }
  };

  return (
    <TableHead
      className={cn(
        className,
        isSortable && 'cursor-pointer hover:bg-muted/50 select-none'
      )}
      onClick={handleClick}
    >
      {children}
    </TableHead>
  );
}
