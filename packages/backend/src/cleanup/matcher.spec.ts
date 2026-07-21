import { fileBelongsToTorrent, matchCandidates } from './matcher';
import type { QbTorrentInfo } from '../qbittorrent/qbittorrent.types';
import type { ScannedFile } from './cleanup.types';

const DAYS = 7;

const file = (path: string, overrides: Partial<ScannedFile> = {}): ScannedFile => ({
  path,
  sizeBytes: 1000,
  ageDays: 10,
  links: 1,
  ...overrides,
});

const torrent = (overrides: Partial<QbTorrentInfo>): QbTorrentInfo => ({
  hash: 'h',
  name: 'name',
  content_path: '/data/file.mkv',
  save_path: '/data',
  category: 'tv',
  tags: '',
  size: 1000,
  ...overrides,
});

describe('fileBelongsToTorrent', () => {
  it('matches an exact single-file content path', () => {
    expect(fileBelongsToTorrent('/data/a.mkv', '/data/a.mkv')).toBe(true);
  });

  it('matches a file inside a multi-file content directory', () => {
    expect(fileBelongsToTorrent('/data/show/ep1.mkv', '/data/show')).toBe(true);
  });

  it('does not match a sibling with a shared prefix', () => {
    expect(fileBelongsToTorrent('/data/show-extra/ep1.mkv', '/data/show')).toBe(false);
  });

  it('returns false for an empty content path', () => {
    expect(fileBelongsToTorrent('/data/a.mkv', '')).toBe(false);
  });
});

describe('matchCandidates', () => {
  it('matches a single fully-unused file to its torrent', () => {
    const candidates = matchCandidates(
      [file('/data/a.mkv')],
      [torrent({ hash: 'h1', content_path: '/data/a.mkv' })],
      DAYS,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].torrents).toHaveLength(1);
    expect(candidates[0].crossSeed).toBe(false);
    expect(candidates[0].totalSizeBytes).toBe(1000);
  });

  it('groups cross-seed duplicates that share a content path', () => {
    const candidates = matchCandidates(
      [file('/data/a.mkv')],
      [
        torrent({ hash: 'h1', content_path: '/data/a.mkv' }),
        torrent({ hash: 'h2', content_path: '/data/a.mkv', name: 'dup' }),
      ],
      DAYS,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].crossSeed).toBe(true);
    expect(candidates[0].torrents.map((t) => t.hash)).toEqual(['h1', 'h2']);
  });

  it('collapses a fully-unused multi-file torrent into one candidate', () => {
    const candidates = matchCandidates(
      [file('/data/show/ep1.mkv'), file('/data/show/ep2.mkv', { ageDays: 20 })],
      [torrent({ hash: 'h1', content_path: '/data/show' })],
      DAYS,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].files).toHaveLength(2);
    expect(candidates[0].ageDays).toBe(20);
    expect(candidates[0].totalSizeBytes).toBe(2000);
  });

  it('excludes a torrent that still has an in-use file (the "sample" case)', () => {
    // A never-imported sample is unlinked, but the real episode is still in use.
    const candidates = matchCandidates(
      [
        file('/data/show/episode.mkv', { links: 2 }), // hardlinked into the library
        file('/data/show/sample.mkv', { links: 1 }), // never imported
      ],
      [torrent({ hash: 'h1', content_path: '/data/show' })],
      DAYS,
    );
    expect(candidates).toHaveLength(0);
  });

  it('excludes a torrent that has a file newer than the threshold', () => {
    const candidates = matchCandidates(
      [file('/data/show/ep1.mkv', { ageDays: 30 }), file('/data/show/ep2.mkv', { ageDays: 2 })],
      [torrent({ hash: 'h1', content_path: '/data/show' })],
      DAYS,
    );
    expect(candidates).toHaveLength(0);
  });

  it('emits orphan candidates for unused files with no matching torrent', () => {
    const candidates = matchCandidates([file('/data/orphan.mkv')], [], DAYS);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].torrents).toHaveLength(0);
    expect(candidates[0].id).toBe('/data/orphan.mkv');
  });

  it('does not emit in-use or recent files as orphans', () => {
    const candidates = matchCandidates(
      [file('/data/in-use.mkv', { links: 3 }), file('/data/recent.mkv', { ageDays: 1 })],
      [],
      DAYS,
    );
    expect(candidates).toHaveLength(0);
  });

  it('parses comma-separated tags into an array', () => {
    const candidates = matchCandidates(
      [file('/data/a.mkv')],
      [torrent({ hash: 'h1', content_path: '/data/a.mkv', tags: 'foo, bar' })],
      DAYS,
    );
    expect(candidates[0].torrents[0].tags).toEqual(['foo', 'bar']);
  });

  it('sorts candidates by descending age', () => {
    const candidates = matchCandidates(
      [file('/data/new.mkv', { ageDays: 8 }), file('/data/old.mkv', { ageDays: 30 })],
      [],
      DAYS,
    );
    expect(candidates.map((c) => c.ageDays)).toEqual([30, 8]);
  });
});
