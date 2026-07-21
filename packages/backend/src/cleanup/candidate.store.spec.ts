import { CandidateStore } from './candidate.store';
import { PrismaService } from '../prisma/prisma.service';
import type { CleanupCandidate, CleanupSummary } from './cleanup.types';

const candidate = (id: string): CleanupCandidate => ({
  id,
  crossSeed: false,
  totalSizeBytes: 100,
  ageDays: 10,
  files: [{ path: `${id}/f.mkv`, sizeBytes: 100, ageDays: 10, links: 1 }],
  torrents: [],
});

describe('CandidateStore', () => {
  let prisma: {
    scanRun: { create: jest.Mock; update: jest.Mock };
    candidate: { deleteMany: jest.Mock; create: jest.Mock; findMany: jest.Mock };
    candidateFile: { deleteMany: jest.Mock };
    cleanupEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let store: CandidateStore;

  beforeEach(() => {
    prisma = {
      scanRun: { create: jest.fn().mockResolvedValue({ id: 'run1' }), update: jest.fn() },
      candidate: {
        deleteMany: jest.fn().mockReturnValue('del'),
        create: jest.fn().mockImplementation((args) => ({ create: args })),
        findMany: jest.fn(),
      },
      candidateFile: { deleteMany: jest.fn().mockReturnValue('delFiles') },
      cleanupEvent: { create: jest.fn().mockReturnValue('event') },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };
    store = new CandidateStore(prisma as unknown as PrismaService);
  });

  it('opens a scan run and returns its id', async () => {
    expect(await store.startScanRun('CRON')).toBe('run1');
    expect(prisma.scanRun.create).toHaveBeenCalledWith({ data: { trigger: 'CRON' } });
  });

  it('replaces candidates and marks the run successful', async () => {
    await store.completeScanRun('run1', [candidate('/a'), candidate('/b')]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = prisma.$transaction.mock.calls[0][0] as unknown[];
    // deleteMany + 2 creates + scanRun.update
    expect(ops).toHaveLength(4);
    expect(prisma.candidate.deleteMany).toHaveBeenCalled();
    expect(prisma.candidate.create).toHaveBeenCalledTimes(2);
    expect(prisma.scanRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run1' },
        data: expect.objectContaining({ status: 'SUCCESS', candidateCount: 2, fileCount: 2 }),
      }),
    );
  });

  it('marks a run failed with the error message', async () => {
    await store.failScanRun('run1', 'boom');
    expect(prisma.scanRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED', error: 'boom' }),
      }),
    );
  });

  it('maps stored candidates to DTOs', async () => {
    prisma.candidate.findMany.mockResolvedValue([
      {
        id: '/a',
        crossSeed: false,
        totalSizeBytes: 100n,
        ageDays: 10,
        files: [{ path: '/a/f.mkv', sizeBytes: 100n, ageDays: 10, links: 1 }],
        torrents: [],
      },
    ]);
    const result = await store.getCandidates();
    expect(result[0].totalSizeBytes).toBe(100);
  });

  it('records a cleanup and only drops successfully-cleaned files', async () => {
    const summary: CleanupSummary = {
      requested: 2,
      cleaned: 1,
      failed: 1,
      removedTorrentHashes: ['h1'],
      items: [
        { path: '/a/f.mkv', removedTorrents: ['h1'], deletedFromDisk: false },
        { path: '/b/f.mkv', removedTorrents: [], deletedFromDisk: false, error: 'nope' },
      ],
    };

    await store.recordCleanup(summary);

    expect(prisma.candidateFile.deleteMany).toHaveBeenCalledWith({
      where: { path: { in: ['/a/f.mkv'] } },
    });
    expect(prisma.cleanupEvent.create).toHaveBeenCalled();
  });
});
