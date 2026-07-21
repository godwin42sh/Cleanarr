import { sep } from 'path';
import type { QbTorrentInfo } from '../qbittorrent/qbittorrent.types';
import type { CleanupCandidate, MatchedTorrent, UnusedFile } from './cleanup.types';

/** True when `file` lives at, or underneath, the torrent's content path. */
export const fileBelongsToTorrent = (filePath: string, contentPath: string): boolean => {
  if (!contentPath) return false;
  if (filePath === contentPath) return true;
  const prefix = contentPath.endsWith(sep) ? contentPath : contentPath + sep;
  return filePath.startsWith(prefix);
};

const toMatchedTorrent = (t: QbTorrentInfo): MatchedTorrent => ({
  hash: t.hash,
  name: t.name,
  contentPath: t.content_path,
  category: t.category,
  tags: t.tags
    ? t.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [],
  sizeBytes: t.size,
});

/**
 * Correlate unused files with qBittorrent torrents, grouping files and
 * torrents that resolve to the same content. Cross-seeded torrents (several
 * torrents pointing at the same content path) are collapsed into a single
 * candidate whose `torrents` array holds every duplicate.
 *
 * Files that match no torrent become standalone (orphan) candidates so they
 * can still be cleaned directly from disk.
 */
export const matchCandidates = (
  files: UnusedFile[],
  torrents: QbTorrentInfo[],
): CleanupCandidate[] => {
  const groups = new Map<string, { files: Map<string, UnusedFile>; torrents: QbTorrentInfo[] }>();
  const matchedFiles = new Set<string>();

  for (const torrent of torrents) {
    const contentPath = torrent.content_path;
    if (!contentPath) continue;

    const owned = files.filter((f) => fileBelongsToTorrent(f.path, contentPath));
    if (owned.length === 0) continue;

    let group = groups.get(contentPath);
    if (!group) {
      group = { files: new Map(), torrents: [] };
      groups.set(contentPath, group);
    }
    group.torrents.push(torrent);
    for (const file of owned) {
      group.files.set(file.path, file);
      matchedFiles.add(file.path);
    }
  }

  const candidates: CleanupCandidate[] = [];

  for (const [id, group] of groups) {
    const groupFiles = [...group.files.values()];
    candidates.push(buildCandidate(id, groupFiles, group.torrents.map(toMatchedTorrent)));
  }

  // Orphans: unused files not referenced by any torrent.
  for (const file of files) {
    if (matchedFiles.has(file.path)) continue;
    candidates.push(buildCandidate(file.path, [file], []));
  }

  return candidates.sort((a, b) => b.ageDays - a.ageDays);
};

const buildCandidate = (
  id: string,
  files: UnusedFile[],
  torrents: MatchedTorrent[],
): CleanupCandidate => ({
  id,
  files,
  torrents,
  crossSeed: torrents.length > 1,
  totalSizeBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
  ageDays: files.reduce((max, f) => Math.max(max, f.ageDays), 0),
});
