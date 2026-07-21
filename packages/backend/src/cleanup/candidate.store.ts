import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toCandidateCreateInput, toCleanupCandidate } from './candidate.mapper';
import type { CleanupCandidate, CleanupSummary } from './cleanup.types';

export type ScanTrigger = 'CRON' | 'MANUAL';

/** Persistence for scan candidates, scan runs, and cleanup history. */
@Injectable()
export class CandidateStore {
  constructor(private readonly prisma: PrismaService) {}

  /** Open a new RUNNING scan run and return its id. */
  async startScanRun(trigger: ScanTrigger): Promise<string> {
    const run = await this.prisma.scanRun.create({ data: { trigger } });
    return run.id;
  }

  /** Replace the stored candidate set and mark the scan run successful. */
  async completeScanRun(runId: string, candidates: CleanupCandidate[]): Promise<void> {
    const fileCount = candidates.reduce((sum, c) => sum + c.files.length, 0);
    await this.prisma.$transaction([
      // Candidates reflect the *current* unused set, so replace wholesale.
      this.prisma.candidate.deleteMany({}),
      ...candidates.map((c) => this.prisma.candidate.create({ data: toCandidateCreateInput(c) })),
      this.prisma.scanRun.update({
        where: { id: runId },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          candidateCount: candidates.length,
          fileCount,
        },
      }),
    ]);
  }

  /** Mark a scan run as failed. */
  async failScanRun(runId: string, error: string): Promise<void> {
    await this.prisma.scanRun.update({
      where: { id: runId },
      data: { status: 'FAILED', finishedAt: new Date(), error },
    });
  }

  /** Read the currently-stored candidates (newest scan). */
  async getCandidates(): Promise<CleanupCandidate[]> {
    const rows = await this.prisma.candidate.findMany({
      include: { files: true, torrents: true },
      orderBy: { ageDays: 'desc' },
    });
    return rows.map(toCleanupCandidate);
  }

  /**
   * Record a cleanup event and drop the successfully-cleaned files (and any
   * candidate left with no files) from the stored set.
   */
  async recordCleanup(summary: CleanupSummary): Promise<void> {
    const cleanedPaths = summary.items.filter((i) => !i.error).map((i) => i.path);

    await this.prisma.$transaction([
      this.prisma.cleanupEvent.create({
        data: {
          requested: summary.requested,
          cleaned: summary.cleaned,
          failed: summary.failed,
          removedTorrentHashes: summary.removedTorrentHashes,
          items: {
            create: summary.items.map((i) => ({
              path: i.path,
              removedTorrents: i.removedTorrents,
              deletedFromDisk: i.deletedFromDisk,
              error: i.error,
            })),
          },
        },
      }),
      this.prisma.candidateFile.deleteMany({ where: { path: { in: cleanedPaths } } }),
      // Remove candidates that no longer own any files.
      this.prisma.candidate.deleteMany({ where: { files: { none: {} } } }),
    ]);
  }
}
