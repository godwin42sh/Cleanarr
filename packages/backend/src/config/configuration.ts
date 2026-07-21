const DEFAULT_EXTENSIONS = [
  'mkv',
  'mp4',
  'flac',
  'm4a',
  'mp3',
  'avi',
  'mov',
  'wmv',
  'webm',
  'mpeg',
  'mpg',
  'mk3d',
  'mka',
  'opus',
  'wav',
  'aac',
  'alac',
];

const splitList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export interface QbittorrentConfig {
  url: string;
  username: string;
  password: string;
}

export interface ScannerConfig {
  dirs: string[];
  days: number;
  extensions: string[];
}

export interface CleanupConfig {
  cron: string;
  auto: boolean;
}

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  qbittorrent: QbittorrentConfig;
  scanner: ScannerConfig;
  cleanup: CleanupConfig;
}

export const configuration = (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: splitList(process.env.CORS_ORIGINS, ['http://localhost:5173']),
  qbittorrent: {
    url: (process.env.QB_URL ?? 'http://localhost:8080').replace(/\/+$/, ''),
    username: process.env.QB_USERNAME ?? 'admin',
    password: process.env.QB_PASSWORD ?? 'adminadmin',
  },
  scanner: {
    dirs: splitList(process.env.SCAN_DIRS, []),
    days: parseInt(process.env.SCAN_DAYS ?? '7', 10),
    extensions: splitList(process.env.MEDIA_EXTENSIONS, DEFAULT_EXTENSIONS),
  },
  cleanup: {
    cron: process.env.CLEANUP_CRON ?? '0 4 * * *',
    auto: (process.env.CLEANUP_AUTO ?? 'false').toLowerCase() === 'true',
  },
});
