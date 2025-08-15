import { useState } from 'react';
import { Badge } from './badge';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  Settings,
  Play,
  Square,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export interface EngineStatus {
  docker_status: 'Running' | 'Stopped' | 'Error' | 'NotInstalled' | 'Loading';
  colima_status: {
    is_installed: boolean;
    is_running: boolean;
    vm_info: {
      cpu: number;
      memory: number;
      disk: number;
      architecture: string;
    } | null;
  };
}

interface EngineStatusIndicatorProps {
  status: EngineStatus | null;
  onStatusChange?: () => void;
}

export function EngineStatusIndicator({
  status,
  onStatusChange,
}: EngineStatusIndicatorProps) {
  const [isRepairing, setIsRepairing] = useState(false);

  const getStatusColor = (status: EngineStatus | null) => {
    if (!status) return 'secondary';
    if (status.docker_status === 'Running' && status.colima_status.is_running)
      return 'default';
    if (
      status.docker_status === 'Stopped' ||
      status.colima_status.is_running === false
    )
      return 'secondary';
    if (status.docker_status === 'Error') return 'destructive';
    return 'secondary';
  };

  const getStatusIcon = (status: EngineStatus | null) => {
    if (!status) return <AlertCircle className="h-4 w-4" />;
    if (status.docker_status === 'Running' && status.colima_status.is_running) {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (status.docker_status === 'Error')
      return <XCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getStatusText = (status: EngineStatus | null) => {
    if (!status) return 'Unknown';
    if (status.docker_status === 'Running' && status.colima_status.is_running)
      return 'Colima Running';
    if (status.docker_status === 'Stopped') return 'Colima Stopped';
    if (status.docker_status === 'Error') return 'Colima Error';
    if (status.docker_status === 'NotInstalled') return 'Not Installed';
    return 'Loading...';
  };

  const handleRepair = async () => {
    try {
      setIsRepairing(true);
      const result = await invoke('repair_colima_installation');
      console.log('Repair result:', result);
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Repair failed:', error);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleStartVM = async () => {
    try {
      // Use default VM config
      const config = {
        cpu_cores: 2,
        memory_gb: 4,
        disk_gb: 20,
        architecture: 'auto',
      };
      await invoke('start_colima_vm', { config });
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Failed to start VM:', error);
    }
  };

  const handleStopVM = async () => {
    try {
      // This would need a new command to stop the VM
      // For now, just refresh status
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Failed to stop VM:', error);
    }
  };
  console.log(status);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          {getStatusIcon(status)}
          <Badge variant={getStatusColor(status)} className="ml-2">
            {getStatusText(status)}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleStartVM} disabled={isRepairing}>
          <Play className="mr-2 h-4 w-4" />
          Start VM
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleStopVM} disabled={isRepairing}>
          <Square className="mr-2 h-4 w-4" />
          Stop VM
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRepair} disabled={isRepairing}>
          <AlertCircle className="mr-2 h-4 w-4" />
          {isRepairing ? 'Repairing...' : 'Repair Installation'}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Engine Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
