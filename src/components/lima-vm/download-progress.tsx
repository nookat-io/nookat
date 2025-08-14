import { Progress } from '../ui/progress';

interface DownloadProgressProps {
  progress: {
    [key: string]: {
      total_bytes: number;
      downloaded_bytes: number;
      speed_bytes_per_sec: number;
      eta_seconds: number;
    };
  } | null;
}

export function DownloadProgress({ progress }: DownloadProgressProps) {
  if (!progress) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Downloading binaries...</span>
          <span className="text-sm text-muted-foreground">Initializing...</span>
        </div>
        <Progress value={0} className="w-full" />
      </div>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number): string => {
    return formatBytes(bytesPerSec) + '/s';
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-4">
      {Object.entries(progress).map(([binary, data]) => {
        const percentage =
          data.total_bytes > 0
            ? (data.downloaded_bytes / data.total_bytes) * 100
            : 0;

        return (
          <div key={binary} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">
                {binary} Binary
              </span>
              <span className="text-sm text-muted-foreground">
                {formatBytes(data.downloaded_bytes)} /{' '}
                {formatBytes(data.total_bytes)}
              </span>
            </div>

            <Progress value={percentage} className="w-full" />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Speed:{' '}
                {data.speed_bytes_per_sec > 0
                  ? formatSpeed(data.speed_bytes_per_sec)
                  : 'Calculating...'}
              </span>
              <span>
                ETA:{' '}
                {data.eta_seconds > 0
                  ? formatDuration(data.eta_seconds)
                  : 'Calculating...'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
