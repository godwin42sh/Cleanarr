// Mirrors the backend cleanup contract (packages/backend/src/cleanup/cleanup.types.ts).

export interface UnusedFile {
  path: string;
  sizeBytes: number;
  ageDays: number;
  links: number;
}

export interface MatchedTorrent {
  hash: string;
  name: string;
  contentPath: string;
  category: string;
  tags: string[];
  sizeBytes: number;
}

export interface CleanupCandidate {
  id: string;
  files: UnusedFile[];
  torrents: MatchedTorrent[];
  crossSeed: boolean;
  totalSizeBytes: number;
  ageDays: number;
}

export interface CleanupResultItem {
  path: string;
  removedTorrents: string[];
  deletedFromDisk: boolean;
  error?: string;
}

export interface CleanupSummary {
  requested: number;
  cleaned: number;
  failed: number;
  removedTorrentHashes: string[];
  items: CleanupResultItem[];
}
