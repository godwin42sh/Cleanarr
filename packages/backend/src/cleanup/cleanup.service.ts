import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { ScannerService } from '../scanner/scanner.service';
import { QbittorrentService } from '../qbittorrent/qbittorrent.service';
import { fileBelongsToTorrent, matchCandidates } from './matcher';
import type { CleanupCandidate, CleanupResultItem, CleanupSummary } from './cleanup.types';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly scanner: ScannerService,
    private readonly qbittorrent: QbittorrentService,
  ) {}

  /**
   * Scan the download directories, correlate the unused files with
   * qBittorrent torrents, and return the resulting cleanup candidates
   * (cross-seed duplicates grouped together).
   */
  async getCandidates(): Promise<CleanupCandidate[]> {
    const [files, torrents] = await Promise.all([
      this.scanner.scan(),
      this.qbittorrent.getTorrents(),
    ]);
    return matchCandidates(files, torrents);
  }

  /**
   * Clean the given files: remove every torrent that references them from
   * qBittorrent (deleting data by default), and delete any orphaned files
   * directly from disk.
   */
  async clean(files: string[], deleteFiles = true): Promise<CleanupSummary> {
    const torrents = await this.qbittorrent.getTorrents();

    const items: CleanupResultItem[] = [];
    const hashesToRemove = new Set<string>();

    // First pass: resolve every requested file to its torrents / orphan state.
    const orphans: string[] = [];
    for (const path of files) {
      const matches = torrents.filter((t) => fileBelongsToTorrent(path, t.content_path));
      if (matches.length > 0) {
        for (const t of matches) hashesToRemove.add(t.hash);
        items.push({ path, removedTorrents: matches.map((t) => t.hash), deletedFromDisk: false });
      } else {
        orphans.push(path);
        items.push({ path, removedTorrents: [], deletedFromDisk: false });
      }
    }

    // Remove all matched torrents in one call (cross-seed duplicates included).
    try {
      await this.qbittorrent.deleteTorrents([...hashesToRemove], deleteFiles);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Failed to delete torrents: ${message}`);
      for (const item of items) {
        if (item.removedTorrents.length > 0) item.error = message;
      }
      return this.summarize(files, items, hashesToRemove);
    }

    // Second pass: orphan files have no torrent, so delete them from disk.
    if (deleteFiles) {
      for (const path of orphans) {
        const item = items.find((i) => i.path === path)!;
        try {
          await fs.unlink(path);
          item.deletedFromDisk = true;
        } catch (err) {
          item.error = (err as Error).message;
          this.logger.warn(`Failed to delete orphan file ${path}: ${item.error}`);
        }
      }
    }

    return this.summarize(files, items, hashesToRemove);
  }

  private summarize(
    requested: string[],
    items: CleanupResultItem[],
    hashes: Set<string>,
  ): CleanupSummary {
    const failed = items.filter((i) => i.error).length;
    const summary: CleanupSummary = {
      requested: requested.length,
      cleaned: items.length - failed,
      failed,
      removedTorrentHashes: [...hashes],
      items,
    };
    this.logger.log(
      `Cleanup complete: ${summary.cleaned}/${summary.requested} file(s), ` +
        `${hashes.size} torrent(s) removed, ${failed} failure(s).`,
    );
    return summary;
  }
}
