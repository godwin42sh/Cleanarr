import type { CleanupCandidate, CleanupSummary } from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Request to ${path} failed (${res.status}): ${body}`);
  }
  return (await res.json()) as T;
}

export const api = {
  getUnused(): Promise<CleanupCandidate[]> {
    return request<CleanupCandidate[]>('/files/unused');
  },

  clean(files: string[], deleteFiles = true): Promise<CleanupSummary> {
    return request<CleanupSummary>('/files/clean', {
      method: 'POST',
      body: JSON.stringify({ files, deleteFiles }),
    });
  },
};
