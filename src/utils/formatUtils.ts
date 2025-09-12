export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;
  
  const unitIndex = Math.floor(Math.log(sizeInBytes) / Math.log(base));
  const size = sizeInBytes / Math.pow(base, unitIndex);
  
  if (unitIndex === 0) {
    return `${size} ${units[unitIndex]}`;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
