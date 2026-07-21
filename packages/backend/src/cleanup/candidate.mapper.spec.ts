import { toCandidateCreateInput, toCleanupCandidate, type DbCandidate } from './candidate.mapper';
import type { CleanupCandidate } from './cleanup.types';

describe('candidate.mapper', () => {
  const dbCandidate: DbCandidate = {
    id: '/data/a.mkv',
    crossSeed: true,
    totalSizeBytes: 2000n,
    ageDays: 12,
    files: [{ path: '/data/a.mkv', sizeBytes: 2000n, ageDays: 12, links: 1 }],
    torrents: [
      {
        hash: 'h1',
        name: 'A',
        contentPath: '/data/a.mkv',
        category: 'tv',
        tags: ['x'],
        sizeBytes: 2000n,
      },
    ],
  };

  it('converts a DB candidate into the DTO, coercing BigInt to number', () => {
    const dto = toCleanupCandidate(dbCandidate);
    expect(dto.totalSizeBytes).toBe(2000);
    expect(typeof dto.totalSizeBytes).toBe('number');
    expect(dto.files[0].sizeBytes).toBe(2000);
    expect(dto.torrents[0].tags).toEqual(['x']);
    expect(dto.crossSeed).toBe(true);
  });

  it('builds a nested create input, coercing number to BigInt', () => {
    const candidate: CleanupCandidate = {
      id: '/data/b.mkv',
      crossSeed: false,
      totalSizeBytes: 500,
      ageDays: 9,
      files: [{ path: '/data/b.mkv', sizeBytes: 500, ageDays: 9, links: 1 }],
      torrents: [],
    };

    const input = toCandidateCreateInput(candidate);
    expect(input.id).toBe('/data/b.mkv');
    expect(input.totalSizeBytes).toBe(500n);
    expect(input.files.create[0].sizeBytes).toBe(500n);
    expect(input.torrents.create).toEqual([]);
  });

  it('round-trips a candidate through create input and back', () => {
    const dto = toCleanupCandidate(dbCandidate);
    const input = toCandidateCreateInput(dto);
    expect(input.files.create[0].sizeBytes).toBe(2000n);
    expect(input.torrents.create[0].hash).toBe('h1');
  });
});
