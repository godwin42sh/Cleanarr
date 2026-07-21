import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CleanupService } from './cleanup.service';
import type { CleanupConfig } from '../config/configuration';

const JOB_NAME = 'cleanup-scan';

/**
 * Periodically scans for unused files and persists the resulting candidates.
 * Cleaning is always manual — this cron never deletes anything.
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
    this.logger.log(`Scheduled scan-only cron "${this.config.cron}".`);
  }

  /** Run one scan cycle. Exposed for testing and manual triggering. */
  async run(): Promise<void> {
    try {
      const candidates = await this.cleanup.scanAndStore('CRON');
      this.logger.log(`Cron scan stored ${candidates.length} candidate(s) for review.`);
    } catch (err) {
      this.logger.error(`Cron scan failed: ${(err as Error).message}`);
    }
  }
}
