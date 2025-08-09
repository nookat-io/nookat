'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { ThemeToggle } from '../ui/theme-toggle';
import { useEngineStatus } from '../../hooks/use-engine-status';
import { EngineState } from '../../types/engine-status';

export function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const { state, version } = useEngineStatus();

  const statusColor =
    state === EngineState.Healthy
      ? 'bg-green-500'
      : state === EngineState.NotInstalled
        ? 'bg-red-500'
        : 'bg-gray-500';

  const statusLabel =
    state === EngineState.NotInstalled
      ? 'Not Installed'
      : state === EngineState.NotRunning
        ? 'Not Running'
        : `Running V${version ? version : ''}`;

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
          title={`Docker status: ${statusLabel}`}
          aria-hidden="true"
        />
        <p className="text-xs text-muted-foreground">{statusLabel}</p>
      </div>
      <ThemeToggle />
    </header>
  );
}
