import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CleanupService } from './cleanup.service';
import type { CleanupConfig } from '../config/configuration';

const JOB_NAME = 'cleanup-scan';

/**
 * Periodically scans for unused files and correlates them with qBittorrent.
 * If CLEANUP_AUTO is enabled it also cleans every candidate it finds;
 * otherwise it just logs how many candidates are awaiting review.
 */
@Injectable()
export class CleanupCron implements OnModuleInit {
  private readonly logger = new Logger(CleanupCron.name);
  private readonly config: CleanupConfig;

  constructor(
    private readonly cleanup: CleanupService,
    private readonly scheduler: SchedulerRegistry,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<CleanupConfig>('cleanup');
  }

  onModuleInit(): void {
    const job = new CronJob(this.config.cron, () => {
      void this.run();
    });
    this.scheduler.addCronJob(JOB_NAME, job as unknown as CronJob);
    job.start();
    this.logger.log(
      `Scheduled cleanup scan "${this.config.cron}" (auto-clean: ${this.config.auto}).`,
    );
  }

  /** Run one scan/clean cycle. Exposed for testing and manual triggering. */
  async run(): Promise<void> {
    try {
      const candidates = await this.cleanup.getCandidates();
      this.logger.log(`Cron scan found ${candidates.length} cleanup candidate(s).`);

      if (!this.config.auto || candidates.length === 0) return;

      const files = candidates.flatMap((c) => c.files.map((f) => f.path));
      const summary = await this.cleanup.clean(files, true);
      this.logger.log(
        `Auto-clean removed ${summary.removedTorrentHashes.length} torrent(s) ` +
          `across ${summary.cleaned} file(s).`,
      );
    } catch (err) {
      this.logger.error(`Cron cleanup cycle failed: ${(err as Error).message}`);
    }
  }
}
