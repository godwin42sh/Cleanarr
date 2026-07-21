import type { CleanupCandidate } from './cleanup.types';

/** Shape of a persisted candidate (with relations) as read from the DB. */
export interface DbCandidate {
  id: string;
  crossSeed: boolean;
  totalSizeBytes: bigint;
  ageDays: number;
  files: { path: string; sizeBytes: bigint; ageDays: number; links: number }[];
  torrents: {
    hash: string;
    name: string;
    contentPath: string;
    category: string;
    tags: string[];
    sizeBytes: bigint;
  }[];
}

/** Convert a persisted candidate into the API DTO (BigInt → number). */
export const toCleanupCandidate = (c: DbCandidate): CleanupCandidate => ({
  id: c.id,
  crossSeed: c.crossSeed,
  totalSizeBytes: Number(c.totalSizeBytes),
  ageDays: c.ageDays,
  files: c.files.map((f) => ({
    path: f.path,
    sizeBytes: Number(f.sizeBytes),
    ageDays: f.ageDays,
    links: f.links,
  })),
  torrents: c.torrents.map((t) => ({
    hash: t.hash,
    name: t.name,
    contentPath: t.contentPath,
    category: t.category,
    tags: t.tags,
    sizeBytes: Number(t.sizeBytes),
  })),
});

/** Build the nested `create` payload persisting a freshly-matched candidate. */
export const toCandidateCreateInput = (c: CleanupCandidate) => ({
  id: c.id,
  crossSeed: c.crossSeed,
  totalSizeBytes: BigInt(c.totalSizeBytes),
  ageDays: c.ageDays,
  files: {
    create: c.files.map((f) => ({
      path: f.path,
      sizeBytes: BigInt(f.sizeBytes),
      ageDays: f.ageDays,
      links: f.links,
    })),
  },
  torrents: {
    create: c.torrents.map((t) => ({
      hash: t.hash,
      name: t.name,
      contentPath: t.contentPath,
      category: t.category,
      tags: t.tags,
      sizeBytes: BigInt(t.sizeBytes),
    })),
  },
});
