/**
 * A media file discovered on disk by the scanner. The scanner reports every
 * media file (not just unused ones) so the matcher can tell whether a torrent
 * is entirely reclaimable.
 */
export interface ScannedFile {
  /** Absolute path to the file. */
  path: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** Age in whole days, based on mtime. */
  ageDays: number;
  /**
   * Hardlink count. `1` means nothing in the library references it (unused);
   * `> 1` means it is still hardlinked into the library (in use).
   */
  links: number;
}

/**
 * A file belonging to a cleanup candidate. Candidates only ever contain fully
 * unused files (`links === 1`), so this is the same shape as a scanned file.
 */
export type UnusedFile = ScannedFile;

/**
 * A qBittorrent torrent that owns one or more unused files. Cross-seed
 * duplicates are surfaced as separate torrents sharing the same files.
 */
export interface MatchedTorrent {
  hash: string;
  name: string;
  /** Path qBittorrent reports as the torrent content root. */
  contentPath: string;
  category: string;
  tags: string[];
  sizeBytes: number;
}

/**
 * A cleanup candidate: a group of unused files that resolve to the same
 * content, together with every torrent (including cross-seed duplicates)
 * that references them.
 */
export interface CleanupCandidate {
  /** Stable identifier for the candidate (the shared content path). */
  id: string;
  /** Unused files belonging to this candidate. */
  files: UnusedFile[];
  /** Torrents referencing these files; length > 1 means cross-seed. */
  torrents: MatchedTorrent[];
  /** True when more than one torrent references the same content. */
  crossSeed: boolean;
  /** Total size of the candidate's files in bytes. */
  totalSizeBytes: number;
  /** Oldest file age in days. */
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
