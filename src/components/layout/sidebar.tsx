'use client';

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Container,
  HardDrive,
  Network,
  Settings,
  Layers,
  ChevronLeft,
  ChevronRight,
  Monitor,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const navigation = [
  { name: 'Containers', href: '/', icon: Container },
  { name: 'Images', href: '/images', icon: Layers },
  { name: 'Volumes', href: '/volumes', icon: HardDrive },
  { name: 'Networks', href: '/networks', icon: Network },
  { name: 'Lima VM', href: '/lima-vm', icon: Monitor },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-200 select-none',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between px-6 py-4 border-b',
          collapsed ? 'mt-1' : ''
        )}
      >
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <img
              src="/logo.png"
              alt="Nookat Logo"
              className="h-10 w-10"
              draggable="false"
            />
            <span className="font-bold text-lg" draggable="false">
              Nookat
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          draggable="false"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map(item => {
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.name} to={item.href} draggable="false">
              <div
                className={cn(
                  'flex items-center px-3 py-2 rounded-lg font-medium transition-colors select-none',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <item.icon className="h-5 w-5" />
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
