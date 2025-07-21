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
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const navigation = [
  { name: 'Containers', href: '/', icon: Container },
  { name: 'Images', href: '/images', icon: Layers },
  { name: 'Volumes', href: '/volumes', icon: HardDrive },
  { name: 'Networks', href: '/networks', icon: Network },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className={cn(
      "flex flex-col border-r bg-card transition-all duration-200",
      collapsed ? "w-20" : "w-64"
    )} style={{ width: collapsed ? '80px' : '256px', minWidth: collapsed ? '80px' : '256px', maxWidth: collapsed ? '80px' : '256px' }}>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Nookat Logo" className="h-10 w-10" />
            <span className="font-bold text-lg">Nookat</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.name} to={item.href}>
              <div className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}>
                <item.icon className="h-8 w-8" />
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}