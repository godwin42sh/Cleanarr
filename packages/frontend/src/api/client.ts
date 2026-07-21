import { cleanFiles, getUnusedFiles, scanFiles } from '@/client';
import type { CleanupCandidateDto, CleanupSummaryDto } from '@/client';

// Thin wrapper over the generated hey-api SDK. The SDK validates every response
// against the Zod schemas generated from the backend's OpenAPI spec, and
// `throwOnError` makes it throw (instead of returning an error result) so
// React Query surfaces failures normally.
export const api = {
  async getUnused(): Promise<CleanupCandidateDto[]> {
    return (await getUnusedFiles({ throwOnError: true })).data;
  },

  async scan(): Promise<CleanupCandidateDto[]> {
    return (await scanFiles({ throwOnError: true })).data;
  },

  async clean(files: string[], deleteFiles = true): Promise<CleanupSummaryDto> {
    return (await cleanFiles({ body: { files, deleteFiles }, throwOnError: true })).data;
  },
};
