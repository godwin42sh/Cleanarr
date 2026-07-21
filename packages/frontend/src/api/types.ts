// Re-export the types generated from the backend's OpenAPI spec under the names
// the UI uses. The generated client (src/client) is the single source of truth.
export type {
  CleanupCandidateDto as CleanupCandidate,
  CleanupSummaryDto as CleanupSummary,
  CleanupResultItemDto as CleanupResultItem,
  MatchedTorrentDto as MatchedTorrent,
  ScannedFileDto as UnusedFile,
} from '@/client';
