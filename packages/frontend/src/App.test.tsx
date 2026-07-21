import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { api } from './api/client';
import type { CleanupCandidate } from './api/types';

vi.mock('./api/client', () => ({
  api: { getUnused: vi.fn(), clean: vi.fn() },
}));

const mockedApi = vi.mocked(api);

const candidate: CleanupCandidate = {
  id: '/data/a.mkv',
  files: [{ path: '/data/a.mkv', sizeBytes: 2048, ageDays: 10, links: 1 }],
  torrents: [
    {
      hash: 'h1',
      name: 'Big.Buck.Bunny',
      contentPath: '/data/a.mkv',
      category: '',
      tags: [],
      sizeBytes: 2048,
    },
  ],
  crossSeed: false,
  totalSizeBytes: 2048,
  ageDays: 10,
};

const renderApp = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
};

describe('App', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders candidates fetched from the API', async () => {
    mockedApi.getUnused.mockResolvedValue([candidate]);
    renderApp();
    expect(await screen.findByText('Big.Buck.Bunny')).toBeInTheDocument();
  });

  it('shows an error state when loading fails', async () => {
    mockedApi.getUnused.mockRejectedValue(new Error('boom'));
    renderApp();
    expect(await screen.findByText(/Failed to load candidates: boom/)).toBeInTheDocument();
  });

  it('cleans and reports the summary', async () => {
    const user = userEvent.setup();
    mockedApi.getUnused.mockResolvedValue([candidate]);
    mockedApi.clean.mockResolvedValue({
      requested: 1,
      cleaned: 1,
      failed: 0,
      removedTorrentHashes: ['h1'],
      items: [],
    });

    renderApp();
    await screen.findByText('Big.Buck.Bunny');
    await user.click(screen.getByRole('button', { name: 'Clean all' }));

    await waitFor(() => expect(mockedApi.clean).toHaveBeenCalledWith(['/data/a.mkv']));
    expect(await screen.findByText(/Cleaned 1 item/)).toBeInTheDocument();
  });
});
