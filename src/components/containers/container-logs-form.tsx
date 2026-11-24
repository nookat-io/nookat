import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Download, RefreshCw, Copy, Search, FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { errorMessage } from '../../utils/error-message';

interface ContainerLogsFormProps {
  containerId: string;
  containerName: string;
  containerState?: string;
  isOpen: boolean;
  onClose: () => void;
}

const LINE_COUNT_OPTIONS = [
  { count: 1000, label: 'Last 1,000 lines' },
  { count: 5000, label: 'Last 5,000 lines' },
  { count: 10000, label: 'Last 10,000 lines' },
];

const DEFAULT_LINE_COUNT = LINE_COUNT_OPTIONS[0].count;

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
  const [isLoading, startLoadingLogs] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [lines, setLines] = useState(DEFAULT_LINE_COUNT);
  const [isSaving, setIsSaving] = useState(false);

  const latestReadId = useRef(0);

  const fetchLogs = useCallback(() => {
    if (!containerId) return;

    const readId = ++latestReadId.current;
    const isLatestRead = () => readId === latestReadId.current;

    startLoadingLogs(async () => {
      try {
        const response = await invoke('container_logs', {
          id: containerId,
          lines,
        });
        if (!isLatestRead()) return;
        startLoadingLogs(() =>
          setLogs(Array.isArray(response) ? response : [])
        );
      } catch (error) {
        if (!isLatestRead()) return;
        console.error('Failed to fetch logs:', error);
        toast.error(`Failed to fetch logs: ${errorMessage(error)}`);
        startLoadingLogs(() => setLogs([]));
      }
    });
  }, [containerId, lines]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'));
      toast.success('Logs copied to clipboard');
    } catch (error) {
      toast.error(`Failed to copy logs: ${errorMessage(error)}`);
    }
  };

  const handleDownloadLogs = async () => {
    setIsSaving(true);
    try {
      const savedPath = await invoke<string | null>('save_container_logs', {
        fileName: `${containerName}-logs.txt`,
        lines: logs,
      });
      if (savedPath) {
        toast.success(`Saved the logs to ${savedPath}`);
      }
    } catch (error) {
      toast.error(`Failed to save logs: ${errorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const hasLogs = logs.length > 0;

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
          <div className="flex items-center gap-4">
            <SearchInput value={searchTerm} onChange={setSearchTerm} />

            <Select
              value={String(lines)}
              onValueChange={value => setLines(Number(value))}
            >
              <SelectTrigger aria-label="Lines" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINE_COUNT_OPTIONS.map(({ count, label }) => (
                  <SelectItem key={count} value={String(count)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

          <div className="flex-1 border rounded-md bg-muted/50 overflow-hidden">
            <div className="p-4 max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {isLoading ? 'Loading logs...' : 'No logs found'}
                </div>
              ) : (
                <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-word">
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
              <ActionButton
                onClick={handleCopyLogs}
                icon={Copy}
                disabled={!hasLogs}
              >
                Copy
              </ActionButton>

              <ActionButton
                onClick={handleDownloadLogs}
                icon={Download}
                disabled={!hasLogs || isSaving}
              >
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
