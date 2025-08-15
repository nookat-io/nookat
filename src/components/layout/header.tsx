'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { ThemeToggle } from '../ui/theme-toggle';
import { useEngineStatus } from '../../hooks/use-engine-status';
import { EngineStatus } from '../../types/engine-status';

const engineStatusToColor = (status: EngineStatus) => {
  if (status === 'Unknown') {
    return 'bg-gray-500';
  }

  if ('Installed' in status) {
    return 'bg-yellow-500';
  }

  if ('Running' in status) {
    return 'bg-green-500';
  }

  return 'bg-gray-500';
};

const engineStatusToLabel = (status: EngineStatus) => {
  if (status === 'Unknown') {
    return 'Unknown';
  }

  if ('Installed' in status) {
    return 'Not Running';
  }

  if ('Running' in status) {
    return 'Running';
  }

  return 'Unknown';
};

const getEngineName = (status: EngineStatus) => {
  if (status === 'Unknown') {
    return 'Container Engine';
  }

  if ('Installed' in status) {
    return status.Installed === 'Docker' ? 'Docker Engine' : 'Colima Engine';
  }

  if ('Running' in status) {
    return status.Running === 'Docker' ? 'Docker Engine' : 'Colima Engine';
  }

  return 'Container Engine';
};

export function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const { status } = useEngineStatus();

  console.log('Engine status in header:', status);

  const statusColor = engineStatusToColor(status);
  const statusLabel = engineStatusToLabel(status);
  const engineName = getEngineName(status);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search containers, images..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 mr-8">
        <span
          className={`w-3 h-3 rounded-full ${statusColor}`}
          title={`${engineName} status: ${statusLabel}`}
          aria-hidden="true"
        />
        <p className="text-xs text-muted-foreground">{statusLabel}</p>
      </div>
      <ThemeToggle />
    </header>
  );
}
