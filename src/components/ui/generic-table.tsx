import { ReactNode } from 'react';
import { ErrorDisplay } from './error-display';
import { Loader2 } from 'lucide-react';

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  width?: string;
}

export interface GenericTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  getItemId: (item: T) => string;
  emptyMessage?: string;
}

export function GenericTable<T>({
  data,
  columns,
  selectedItems,
  onSelectionChange,
  isLoading,
  error,
  onRetry,
  getItemId,
  emptyMessage = 'No items found',
}: GenericTableProps<T>) {
  const handleSelectAll = () => {
    if (selectedItems.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(getItemId));
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    onSelectionChange(newSelected);
  };

  if (error) {
    return <ErrorDisplay error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-4 text-left">
              <input
                type="checkbox"
                checked={
                  selectedItems.length === data.length && data.length > 0
                }
                onChange={handleSelectAll}
                className="rounded"
              />
            </th>
            {columns.map(column => (
              <th
                key={String(column.key)}
                className="p-4 text-left font-medium"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => {
            const itemId = getItemId(item);
            const isSelected = selectedItems.includes(itemId);

            return (
              <tr
                key={itemId}
                className={`border-b hover:bg-muted/50 ${
                  isSelected ? 'bg-muted/30' : ''
                }`}
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectItem(itemId)}
                    className="rounded"
                  />
                </td>
                {columns.map(column => (
                  <td key={String(column.key)} className="p-4">
                    {column.render
                      ? column.render(item)
                      : String(item[column.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
