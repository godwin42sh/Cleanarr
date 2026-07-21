import { promises as fs } from 'fs';
import { CleanupService } from './cleanup.service';
import { ScannerService } from '../scanner/scanner.service';
import { QbittorrentService } from '../qbittorrent/qbittorrent.service';
import type { QbTorrentInfo } from '../qbittorrent/qbittorrent.types';
import type { UnusedFile } from './cleanup.types';

jest.mock('fs', () => ({ promises: { unlink: jest.fn() } }));
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
  let service: CleanupService;

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = { scan: jest.fn() };
    qb = { getTorrents: jest.fn(), deleteTorrents: jest.fn().mockResolvedValue(undefined) };
    service = new CleanupService(
      scanner as unknown as ScannerService,
      qb as unknown as QbittorrentService,
    );
  });

  describe('getCandidates', () => {
    it('scans and matches in one call', async () => {
      scanner.scan.mockResolvedValue([file('/data/a.mkv')]);
      qb.getTorrents.mockResolvedValue([torrent('h1', '/data/a.mkv')]);

      const candidates = await service.getCandidates();
      expect(candidates).toHaveLength(1);
      expect(candidates[0].torrents[0].hash).toBe('h1');
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
      expect(summary.failed).toBe(0);
    });

    it('deletes orphan files from disk', async () => {
      qb.getTorrents.mockResolvedValue([]);
      mockedFs.unlink.mockResolvedValue(undefined);

      const summary = await service.clean(['/data/orphan.mkv'], true);

      expect(mockedFs.unlink).toHaveBeenCalledWith('/data/orphan.mkv');
      expect(summary.items[0].deletedFromDisk).toBe(true);
      expect(qb.deleteTorrents).toHaveBeenCalledWith([], true);
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
