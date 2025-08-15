// Engine Settings Utilities

export const formatBytes = (bytes?: number) => {
  if (bytes === null || bytes === undefined) return 'Unknown';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};
