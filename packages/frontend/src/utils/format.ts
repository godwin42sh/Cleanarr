const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** Human-readable file size (base-1024). */
export function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(value >= 100 || exp === 0 ? 0 : 1)} ${UNITS[exp]}`;
}

/** Human-readable age, e.g. "12 days". */
export function formatAge(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}
