'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { ThemeToggle } from '../ui/theme-toggle';

export function Header() {
  const [searchTerm, setSearchTerm] = useState('');

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

      <div className="flex items-center space-x-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
