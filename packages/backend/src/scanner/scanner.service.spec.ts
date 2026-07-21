import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { ScannerService } from './scanner.service';
import type { ScannerConfig } from '../config/configuration';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

// Cast to plain jest mocks to sidestep fs's heavily-overloaded signatures.
const mockedReaddir = fs.readdir as unknown as jest.Mock;
const mockedStat = fs.stat as unknown as jest.Mock;

const dirent = (name: string, isDir: boolean) => ({
  name,
  isDirectory: () => isDir,
  isFile: () => !isDir,
});

const makeService = (config: Partial<ScannerConfig> = {}): ScannerService => {
  const full: ScannerConfig = {
    dirs: ['/downloads'],
    days: 7,
    extensions: ['mkv', 'mp3'],
    ...config,
  };
  const configService = { getOrThrow: () => full } as unknown as ConfigService;
  return new ScannerService(configService);
};

const NOW = 1_000_000_000_000;
const daysAgo = (days: number): number => NOW - days * 86_400_000;

describe('ScannerService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports old, unlinked media files', async () => {
    mockedReaddir.mockResolvedValueOnce([dirent('movie.mkv', false)]);
    mockedStat.mockResolvedValueOnce({
      size: 500,
      nlink: 1,
      mtimeMs: daysAgo(10),
    } as import('fs').Stats);

    const result = await makeService().scan(NOW);

    expect(result).toEqual([
      { path: '/downloads/movie.mkv', sizeBytes: 500, ageDays: 10, links: 1 },
    ]);
  });

  it('skips files that still have hardlinks', async () => {
    mockedReaddir.mockResolvedValueOnce([dirent('movie.mkv', false)]);
    mockedStat.mockResolvedValueOnce({
      size: 500,
      nlink: 2,
      mtimeMs: daysAgo(10),
    } as import('fs').Stats);

    expect(await makeService().scan(NOW)).toEqual([]);
  });

  it('skips files younger than the threshold', async () => {
    mockedReaddir.mockResolvedValueOnce([dirent('movie.mkv', false)]);
    mockedStat.mockResolvedValueOnce({
      size: 500,
      nlink: 1,
      mtimeMs: daysAgo(3),
    } as import('fs').Stats);

    expect(await makeService().scan(NOW)).toEqual([]);
  });

  it('ignores non-media extensions', async () => {
    mockedReaddir.mockResolvedValueOnce([dirent('note.txt', false)]);
    expect(await makeService().scan(NOW)).toEqual([]);
    expect(mockedStat).not.toHaveBeenCalled();
  });

  it('recurses into subdirectories', async () => {
    mockedReaddir
      .mockResolvedValueOnce([dirent('sub', true)])
      .mockResolvedValueOnce([dirent('ep.mkv', false)]);
    mockedStat.mockResolvedValueOnce({
      size: 100,
      nlink: 1,
      mtimeMs: daysAgo(30),
    } as import('fs').Stats);

    const result = await makeService().scan(NOW);
    expect(result.map((f) => f.path)).toEqual(['/downloads/sub/ep.mkv']);
  });

  it('tolerates unreadable directories', async () => {
    mockedReaddir.mockRejectedValueOnce(new Error('EACCES'));
    expect(await makeService().scan(NOW)).toEqual([]);
  });
});
