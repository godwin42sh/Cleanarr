import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import type { ScannerConfig } from '../config/configuration';
import type { ScannedFile } from '../cleanup/cleanup.types';

const MS_PER_DAY = 86_400_000;

/**
 * Walks the configured download directories and reports every media file with
 * its hardlink count and age. Reporting all files (not just unlinked ones) lets
 * the matcher decide whether a torrent's content is entirely reclaimable — a
 * torrent must not be flagged just because one file (e.g. a never-imported
 * "sample") happens to be unlinked while the rest is still in use.
 */
@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private readonly config: ScannerConfig;
  private readonly extensions: Set<string>;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<ScannerConfig>('scanner');
    this.extensions = new Set(this.config.extensions.map((ext) => ext.toLowerCase()));
  }

  /** Scan every configured directory and return all media files found. */
  async scan(now: number = Date.now()): Promise<ScannedFile[]> {
    const results: ScannedFile[] = [];
    for (const dir of this.config.dirs) {
      this.logger.debug(`Scanning ${dir}`);
      await this.walk(dir, now, results);
    }
    this.logger.log(
      `Found ${results.length} media file(s) across ${this.config.dirs.length} dir(s).`,
    );
    return results;
  }

  private isMediaFile(name: string): boolean {
    const ext = extname(name).slice(1).toLowerCase();
    return ext.length > 0 && this.extensions.has(ext);
  }

  private async walk(dir: string, now: number, results: ScannedFile[]): Promise<void> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      this.logger.warn(`Cannot read directory ${dir}: ${(err as Error).message}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.walk(fullPath, now, results);
        continue;
      }

      if (!entry.isFile() || !this.isMediaFile(entry.name)) {
        continue;
      }

      try {
        const stat = await fs.stat(fullPath);
        results.push({
          path: fullPath,
          sizeBytes: stat.size,
          ageDays: Math.floor((now - stat.mtimeMs) / MS_PER_DAY),
          links: stat.nlink,
        });
      } catch (err) {
        this.logger.warn(`Cannot stat ${fullPath}: ${(err as Error).message}`);
      }
    }
  }
}
