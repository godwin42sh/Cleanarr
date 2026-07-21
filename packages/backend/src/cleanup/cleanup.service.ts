import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { ScannerService } from '../scanner/scanner.service';
import { QbittorrentService } from '../qbittorrent/qbittorrent.service';
import { CandidateStore, type ScanTrigger } from './candidate.store';
import { fileBelongsToTorrent, matchCandidates } from './matcher';
import type { ScannerConfig } from '../config/configuration';
import type { CleanupCandidate, CleanupResultItem, CleanupSummary } from './cleanup.types';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly days: number;

  constructor(
    private readonly scanner: ScannerService,
    private readonly qbittorrent: QbittorrentService,
    private readonly store: CandidateStore,
    configService: ConfigService,
  ) {
    this.days = configService.getOrThrow<ScannerConfig>('scanner').days;
  }

  /**
   * Run a live scan: walk the download directories, correlate the unused files
   * with qBittorrent torrents, persist the resulting candidates, and return
   * them. Used by the cron (CRON) and the manual rescan endpoint (MANUAL).
   */
  async scanAndStore(trigger: ScanTrigger): Promise<CleanupCandidate[]> {
    const runId = await this.store.startScanRun(trigger);
    try {
      const [files, torrents] = await Promise.all([
        this.scanner.scan(),
        this.qbittorrent.getTorrents(),
      ]);
      const candidates = matchCandidates(files, torrents, this.days);
      await this.store.completeScanRun(runId, candidates);
      this.logger.log(`Scan (${trigger}) stored ${candidates.length} candidate(s).`);
      return candidates;
    } catch (err) {
      const message = (err as Error).message;
      await this.store.failScanRun(runId, message);
      this.logger.error(`Scan (${trigger}) failed: ${message}`);
      throw err;
    }
  }

  /** Return the candidates persisted by the most recent scan. */
  getStoredCandidates(): Promise<CleanupCandidate[]> {
    return this.store.getCandidates();
  }

  /**
   * Manually clean the given files: remove every torrent that references them
   * from qBittorrent (deleting data by default), delete orphaned files from
   * disk, and record the outcome as a cleanup event.
   */
  async clean(files: string[], deleteFiles = true): Promise<CleanupSummary> {
    const torrents = await this.qbittorrent.getTorrents();

    const items: CleanupResultItem[] = [];
    const hashesToRemove = new Set<string>();
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

    try {
      await this.qbittorrent.deleteTorrents([...hashesToRemove], deleteFiles);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Failed to delete torrents: ${message}`);
      for (const item of items) {
        if (item.removedTorrents.length > 0) item.error = message;
      }
      return this.finalize(files, items, hashesToRemove);
    }

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

    return this.finalize(files, items, hashesToRemove);
  }

  private async finalize(
    requested: string[],
    items: CleanupResultItem[],
    hashes: Set<string>,
  ): Promise<CleanupSummary> {
    const failed = items.filter((i) => i.error).length;
    const summary: CleanupSummary = {
      requested: requested.length,
      cleaned: items.length - failed,
      failed,
      removedTorrentHashes: [...hashes],
      items,
    };

    await this.store.recordCleanup(summary);

    this.logger.log(
      `Cleanup complete: ${summary.cleaned}/${summary.requested} file(s), ` +
        `${hashes.size} torrent(s) removed, ${failed} failure(s).`,
    );
    return summary;
  }
}
