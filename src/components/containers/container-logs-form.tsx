'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Download, 
  RefreshCw, 
  Copy, 
  Search,
  FileText
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface ContainerLogsFormProps {
  containerId: string;
  containerName: string;
  containerState?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  timestamp: string;
  message: string;
  level?: 'info' | 'warn' | 'error';
}

// Constants
const LOG_LEVEL_CONFIG = {
  error: { variant: 'destructive' as const, label: 'Error' },
  warn: { variant: 'secondary' as const, label: 'Warning' },
  info: { variant: 'default' as const, label: 'Info' },
  default: { variant: 'outline' as const, label: 'Log' }
} as const;

// Utility functions
const parseLogLine = (logLine: string): LogEntry => {
  const parts = logLine.split(' ', 2);
  const timestamp = parts[0];
  const message = parts[1] || logLine;
  
  let level: 'info' | 'warn' | 'error' | undefined;
  if (message.toLowerCase().includes('error')) {
    level = 'error';
  } else if (message.toLowerCase().includes('warn')) {
    level = 'warn';
  } else {
    level = 'info';
  }
  
  return { timestamp, message, level };
};

const getLogLevelConfig = (level?: string) => {
  return LOG_LEVEL_CONFIG[level as keyof typeof LOG_LEVEL_CONFIG] || LOG_LEVEL_CONFIG.default;
};

const exportLogs = (logs: LogEntry[], filename: string) => {
  const logText = logs.map(log => `${log.timestamp} ${log.message}`).join('\n');
  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Reusable components
const LogEntryItem = ({ log }: { log: LogEntry }) => {
  const config = getLogLevelConfig(log.level);
  
  return (
    <div className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
      <div className="flex-shrink-0">
        <Badge variant={config.variant} className="text-xs">
          {config.label}
        </Badge>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">
          {new Date(log.timestamp).toLocaleString()}
        </div>
        <div className="text-sm font-mono break-words">
          {log.message}
        </div>
      </div>
    </div>
  );
};

const SearchInput = ({ 
  value, 
  onChange, 
  placeholder = "Search logs..." 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
}) => (
  <div className="flex-1 relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-10"
    />
  </div>
);

const ActionButton = ({ 
  onClick, 
  icon: Icon, 
  children, 
  disabled = false,
  variant = "outline" as const,
  size = "sm" as const
}: { 
  onClick: () => void; 
  icon: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode; 
  disabled?: boolean;
  variant?: "outline" | "default";
  size?: "sm" | "default";
}) => (
  <Button
    variant={variant}
    size={size}
    onClick={onClick}
    disabled={disabled}
  >
    <Icon className="h-4 w-4 mr-2" />
    {children}
  </Button>
);

export function ContainerLogsForm({ 
  containerId, 
  containerName, 
  containerState,
  isOpen, 
  onClose 
}: ContainerLogsFormProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await invoke<string[]>('container_logs', { 
        id: containerId,
        since: null,
        until: null,
        follow: false
      });
      
      const parsedLogs = response.map(parseLogLine);
      setLogs(parsedLogs);
      toast.success('Logs loaded successfully');
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error(`Failed to fetch logs: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, containerId]);

  const handleCopyLogs = () => {
    const logText = logs.map(log => `${log.timestamp} ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText);
    toast.success('Logs copied to clipboard');
  };

  const handleDownloadLogs = () => {
    exportLogs(logs, `${containerName}-logs.txt`);
    toast.success('Logs downloaded');
  };

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isContainerRunning = containerState === 'running';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Container Logs: {containerName}
          </DialogTitle>
          <DialogDescription>
            View logs for container {containerId}
            {!isContainerRunning && containerState && (
              <span className="block mt-1 text-amber-600 dark:text-amber-400">
                Container is {containerState}. Historical logs only.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          {/* Controls */}
          <div className="flex items-center gap-4">
            <SearchInput 
              value={searchTerm} 
              onChange={setSearchTerm} 
            />
            
            <ActionButton
              onClick={fetchLogs}
              icon={RefreshCw}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                'Refresh'
              )}
            </ActionButton>
          </div>

          {/* Logs Display */}
          <div className="flex-1 border rounded-md bg-muted/50 overflow-hidden">
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {isLoading ? 'Loading logs...' : 'No logs found'}
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <LogEntryItem key={index} log={log} />
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {filteredLogs.length} log entries
            </div>
            
            <div className="flex items-center gap-2">
              <ActionButton onClick={handleCopyLogs} icon={Copy}>
                Copy
              </ActionButton>
              
              <ActionButton onClick={handleDownloadLogs} icon={Download}>
                Download
              </ActionButton>
              
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 