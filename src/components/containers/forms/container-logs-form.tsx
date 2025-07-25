'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Download, RefreshCw, Copy, Search, FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface ContainerLogsFormProps {
  containerId: string;
  containerName: string;
  containerState?: string;
  isOpen: boolean;
  onClose: () => void;
}

const exportLogs = (logs: string[], filename: string) => {
  const logText = logs.join('\n');
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

const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search logs...',
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
      onChange={e => onChange(e.target.value)}
      className="pl-10"
    />
  </div>
);

const ActionButton = ({
  onClick,
  icon: Icon,
  children,
  disabled = false,
  variant = 'outline' as const,
  size = 'sm' as const,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'outline' | 'default';
  size?: 'sm' | 'default';
}) => (
  <Button variant={variant} size={size} onClick={onClick} disabled={disabled}>
    <Icon className="h-4 w-4 mr-2" />
    {children}
  </Button>
);

export function ContainerLogsForm({
  containerId,
  containerName,
  containerState,
  isOpen,
  onClose,
}: ContainerLogsFormProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await invoke<string[]>('container_logs', {
        id: containerId,
      });

      setLogs(response);
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
    const logText = logs.join('\n');
    navigator.clipboard.writeText(logText);
    toast.success('Logs copied to clipboard');
  };

  const handleDownloadLogs = () => {
    exportLogs(logs, `${containerName}-logs.txt`);
    toast.success('Logs downloaded');
  };

  const filteredLogs = logs.filter(log =>
    log.toLowerCase().includes(searchTerm.toLowerCase())
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
            <SearchInput value={searchTerm} onChange={setSearchTerm} />

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
            <div className="p-4 max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {isLoading ? 'Loading logs...' : 'No logs found'}
                </div>
              ) : (
                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                  {filteredLogs.join('\n')}
                </pre>
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

              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
