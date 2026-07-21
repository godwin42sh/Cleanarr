import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { CleanupService } from './cleanup.service';
import { ScannerService } from '../scanner/scanner.service';
import { QbittorrentService } from '../qbittorrent/qbittorrent.service';
import { CandidateStore } from './candidate.store';
import type { QbTorrentInfo } from '../qbittorrent/qbittorrent.types';
import type { UnusedFile } from './cleanup.types';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return { ...actual, promises: { ...actual.promises, unlink: jest.fn() } };
});
const mockedFs = fs as jest.Mocked<typeof fs>;

const torrent = (hash: string, content_path: string): QbTorrentInfo => ({
  hash,
  name: hash,
  content_path,
  save_path: '/data',
  category: '',
  tags: '',
  size: 10,
});

const file = (path: string): UnusedFile => ({ path, sizeBytes: 10, ageDays: 10, links: 1 });

describe('CleanupService', () => {
  let scanner: jest.Mocked<Pick<ScannerService, 'scan'>>;
  let qb: jest.Mocked<Pick<QbittorrentService, 'getTorrents' | 'deleteTorrents'>>;
  let store: jest.Mocked<
    Pick<
      CandidateStore,
      'startScanRun' | 'completeScanRun' | 'failScanRun' | 'getCandidates' | 'recordCleanup'
    >
  >;
  let service: CleanupService;

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = { scan: jest.fn() };
    qb = { getTorrents: jest.fn(), deleteTorrents: jest.fn().mockResolvedValue(undefined) };
    store = {
      startScanRun: jest.fn().mockResolvedValue('run1'),
      completeScanRun: jest.fn().mockResolvedValue(undefined),
      failScanRun: jest.fn().mockResolvedValue(undefined),
      getCandidates: jest.fn(),
      recordCleanup: jest.fn().mockResolvedValue(undefined),
    };
    const configService = {
      getOrThrow: () => ({ dirs: [], days: 7, extensions: [] }),
    } as unknown as ConfigService;
    service = new CleanupService(
      scanner as unknown as ScannerService,
      qb as unknown as QbittorrentService,
      store as unknown as CandidateStore,
      configService,
    );
  });

  describe('scanAndStore', () => {
    it('scans, matches, and persists the candidates', async () => {
      scanner.scan.mockResolvedValue([file('/data/a.mkv')]);
      qb.getTorrents.mockResolvedValue([torrent('h1', '/data/a.mkv')]);

      const candidates = await service.scanAndStore('CRON');

      expect(store.startScanRun).toHaveBeenCalledWith('CRON');
      expect(candidates).toHaveLength(1);
      expect(store.completeScanRun).toHaveBeenCalledWith('run1', candidates);
      expect(store.failScanRun).not.toHaveBeenCalled();
    });

    it('marks the run failed and rethrows when scanning fails', async () => {
      scanner.scan.mockResolvedValue([]);
      qb.getTorrents.mockRejectedValue(new Error('qb down'));

      await expect(service.scanAndStore('MANUAL')).rejects.toThrow('qb down');
      expect(store.failScanRun).toHaveBeenCalledWith('run1', 'qb down');
      expect(store.completeScanRun).not.toHaveBeenCalled();
    });
  });

  describe('getStoredCandidates', () => {
    it('reads from the store', async () => {
      const stored = [
        {
          id: '/a',
          crossSeed: false,
          totalSizeBytes: 1,
          ageDays: 1,
          files: [],
          torrents: [],
        },
      ];
      store.getCandidates.mockResolvedValue(stored);
      expect(await service.getStoredCandidates()).toBe(stored);
    });
  });

  describe('clean', () => {
    it('removes all torrents referencing the given files, including cross-seed', async () => {
      qb.getTorrents.mockResolvedValue([
        torrent('h1', '/data/a.mkv'),
        torrent('h2', '/data/a.mkv'),
      ]);

      const summary = await service.clean(['/data/a.mkv'], true);

      expect(qb.deleteTorrents).toHaveBeenCalledWith(['h1', 'h2'], true);
      expect(summary.removedTorrentHashes).toEqual(['h1', 'h2']);
      expect(summary.cleaned).toBe(1);
      expect(store.recordCleanup).toHaveBeenCalledWith(summary);
    });

    it('deletes orphan files from disk', async () => {
      qb.getTorrents.mockResolvedValue([]);
      mockedFs.unlink.mockResolvedValue(undefined);

      const summary = await service.clean(['/data/orphan.mkv'], true);

      expect(mockedFs.unlink).toHaveBeenCalledWith('/data/orphan.mkv');
      expect(summary.items[0].deletedFromDisk).toBe(true);
      expect(store.recordCleanup).toHaveBeenCalled();
    });

    it('does not touch disk when deleteFiles is false', async () => {
      qb.getTorrents.mockResolvedValue([]);
      await service.clean(['/data/orphan.mkv'], false);
      expect(mockedFs.unlink).not.toHaveBeenCalled();
    });

    it('records an error when torrent deletion fails', async () => {
      qb.getTorrents.mockResolvedValue([torrent('h1', '/data/a.mkv')]);
      qb.deleteTorrents.mockRejectedValue(new Error('qb down'));

      const summary = await service.clean(['/data/a.mkv'], true);

      expect(summary.failed).toBe(1);
      expect(summary.items[0].error).toBe('qb down');
      expect(store.recordCleanup).toHaveBeenCalledWith(summary);
    });

    it('records an error when an orphan file cannot be deleted', async () => {
      qb.getTorrents.mockResolvedValue([]);
      mockedFs.unlink.mockRejectedValue(new Error('ENOENT'));

      const summary = await service.clean(['/data/orphan.mkv'], true);

      expect(summary.failed).toBe(1);
      expect(summary.items[0].error).toBe('ENOENT');
    });
  });
});
