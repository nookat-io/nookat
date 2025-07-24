/**
 * Formats bytes into a human-readable string with appropriate units
 * @param bytes - The number of bytes to format
 * @returns A formatted string with units (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  // Input validation for negative numbers
  if (bytes < 0) {
    return 'Invalid size';
  }
  
  // Input validation for non-finite values (NaN, Infinity, -Infinity)
  if (!Number.isFinite(bytes)) {
    return 'Invalid size';
  }
  
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Ensure index doesn't exceed array bounds
  const maxIndex = sizes.length - 1;
  const safeIndex = Math.min(i, maxIndex);
  
  return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(1)) + ' ' + sizes[safeIndex];
} 