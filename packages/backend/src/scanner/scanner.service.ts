import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import type { ScannerConfig } from '../config/configuration';
import type { UnusedFile } from '../cleanup/cleanup.types';

const MS_PER_DAY = 86_400_000;

/**
 * Walks the configured download directories and reports media files that are
 * both old enough and no longer hardlinked anywhere (nlink === 1), mirroring
 * the behaviour of the original shell script.
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

  /** Scan every configured directory and return all unused files found. */
  async scan(now: number = Date.now()): Promise<UnusedFile[]> {
    const results: UnusedFile[] = [];
    for (const dir of this.config.dirs) {
      this.logger.debug(`Scanning ${dir}`);
      await this.walk(dir, now, results);
    }
    this.logger.log(
      `Found ${results.length} unused file(s) across ${this.config.dirs.length} dir(s).`,
    );
    return results;
  }

  private isMediaFile(name: string): boolean {
    const ext = extname(name).slice(1).toLowerCase();
    return ext.length > 0 && this.extensions.has(ext);
  }

  private async walk(dir: string, now: number, results: UnusedFile[]): Promise<void> {
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
        const ageDays = Math.floor((now - stat.mtimeMs) / MS_PER_DAY);
        if (ageDays < this.config.days) continue;
        if (stat.nlink !== 1) continue;

        results.push({
          path: fullPath,
          sizeBytes: stat.size,
          ageDays,
          links: stat.nlink,
        });
      } catch (err) {
        this.logger.warn(`Cannot stat ${fullPath}: ${(err as Error).message}`);
      }
    }
  }
}
