import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CollapsibleSectionProps } from './types';

export const CollapsibleSection = ({
  title,
  children,
  isOpen,
  onToggle,
}: CollapsibleSectionProps) => (
  <Card className="mb-4">
    <CardHeader
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-500" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" aria-hidden="true" />
        )}
      </div>
    </CardHeader>
    {isOpen && <CardContent>{children}</CardContent>}
  </Card>
);
