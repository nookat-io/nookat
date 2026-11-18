const BYTES_PER_KILOBYTE = 1024;
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
  if (bytes < 0 || !Number.isFinite(bytes)) {
    return 'Invalid size';
  }

  if (bytes === 0) return '0 B';

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KILOBYTE)),
    BYTE_UNITS.length - 1
  );
  const value = bytes / BYTES_PER_KILOBYTE ** unitIndex;

  return `${parseFloat(value.toFixed(1))} ${BYTE_UNITS[unitIndex]}`;
}
