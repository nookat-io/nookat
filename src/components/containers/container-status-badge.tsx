'use client';

import { Badge } from '../ui/badge';

interface ContainerStatusBadgeProps {
  state: string;
}

export function ContainerStatusBadge({ state }: ContainerStatusBadgeProps) {
  const getStatusVariant = (state: string) => {
    switch (state) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'restarting':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'exited':
      case 'dead':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'removing':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return '';
    }
  };

  return (
    <Badge variant="secondary" className={getStatusVariant(state)}>
      {state}
    </Badge>
  );
}
