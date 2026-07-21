import { sep } from 'path';
import type { QbTorrentInfo } from '../qbittorrent/qbittorrent.types';
import type { CleanupCandidate, MatchedTorrent, ScannedFile } from './cleanup.types';

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

/** A file is reclaimable when nothing links to it and it is old enough. */
const isReclaimable = (file: ScannedFile, days: number): boolean =>
  file.links === 1 && file.ageDays >= days;

/**
 * True only when a torrent's content is entirely reclaimable: every one of its
 * media files must be unlinked (nothing imported into the library) and old
 * enough. A single still-in-use file (or a recently-modified one) disqualifies
 * the whole torrent — this is what keeps "sample" files from flagging a torrent
 * whose real content is still in use.
 */
const isTorrentReclaimable = (files: ScannedFile[], days: number): boolean =>
  files.length > 0 && files.every((f) => isReclaimable(f, days));

/**
 * Correlate scanned files with qBittorrent torrents and return the torrents
 * whose content is entirely unused (no file still hardlinked into the library).
 * Cross-seeded torrents (several torrents pointing at the same content path) are
 * collapsed into a single candidate whose `torrents` array holds every duplicate.
 *
 * Unused files that match no torrent become standalone (orphan) candidates so
 * they can still be cleaned directly from disk.
 */
export const matchCandidates = (
  files: ScannedFile[],
  torrents: QbTorrentInfo[],
  days: number,
): CleanupCandidate[] => {
  const groups = new Map<string, { files: Map<string, ScannedFile>; torrents: QbTorrentInfo[] }>();
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
    // Mark every owned file as matched (used or not) so an in-use file never
    // leaks out as an orphan candidate.
    for (const file of owned) {
      group.files.set(file.path, file);
      matchedFiles.add(file.path);
    }
  }

  const candidates: CleanupCandidate[] = [];

  for (const [id, group] of groups) {
    const groupFiles = [...group.files.values()];
    if (!isTorrentReclaimable(groupFiles, days)) continue;
    candidates.push(buildCandidate(id, groupFiles, group.torrents.map(toMatchedTorrent)));
  }

  // Orphans: reclaimable files not referenced by any torrent.
  for (const file of files) {
    if (matchedFiles.has(file.path)) continue;
    if (!isReclaimable(file, days)) continue;
    candidates.push(buildCandidate(file.path, [file], []));
  }

  return candidates.sort((a, b) => b.ageDays - a.ageDays);
};

const buildCandidate = (
  id: string,
  files: ScannedFile[],
  torrents: MatchedTorrent[],
): CleanupCandidate => ({
  id,
  files,
  torrents,
  crossSeed: torrents.length > 1,
  totalSizeBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
  ageDays: files.reduce((max, f) => Math.max(max, f.ageDays), 0),
});
