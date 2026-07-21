import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandidateList } from './CandidateList';
import type { CleanupCandidate } from '../api/types';

const candidate = (id: string, overrides: Partial<CleanupCandidate> = {}): CleanupCandidate => ({
  id,
  files: [{ path: `${id}/file.mkv`, sizeBytes: 1024 * 1024, ageDays: 12, links: 1 }],
  torrents: [
    { hash: 'h', name: `torrent-${id}`, contentPath: id, category: '', tags: [], sizeBytes: 1024 },
  ],
  crossSeed: false,
  totalSizeBytes: 1024 * 1024,
  ageDays: 12,
  ...overrides,
});

describe('CandidateList', () => {
  it('shows an empty state when there is nothing to clean', () => {
    render(<CandidateList candidates={[]} onClean={vi.fn()} isCleaning={false} />);
    expect(screen.getByText(/Nothing to clean/i)).toBeInTheDocument();
  });

  it('renders a row per candidate with a cross-seed badge', () => {
    render(
      <CandidateList
        candidates={[
          candidate('/a', {
            crossSeed: true,
            torrents: [
              {
                hash: 'h1',
                name: 'torrent-a',
                contentPath: '/a',
                category: '',
                tags: [],
                sizeBytes: 1,
              },
              { hash: 'h2', name: 'dup', contentPath: '/a', category: '', tags: [], sizeBytes: 1 },
            ],
          }),
        ]}
        onClean={vi.fn()}
        isCleaning={false}
      />,
    );
    expect(screen.getByText('torrent-a')).toBeInTheDocument();
    expect(screen.getByText(/cross-seed ×2/)).toBeInTheDocument();
  });

  it('cleans the files of selected candidates', async () => {
    const user = userEvent.setup();
    const onClean = vi.fn();
    render(
      <CandidateList
        candidates={[candidate('/a'), candidate('/b')]}
        onClean={onClean}
        isCleaning={false}
      />,
    );

    await user.click(screen.getByLabelText('Select torrent-/a'));
    await user.click(screen.getByRole('button', { name: 'Clean selected' }));

    expect(onClean).toHaveBeenCalledWith(['/a/file.mkv']);
  });

  it('clean all sends every file', async () => {
    const user = userEvent.setup();
    const onClean = vi.fn();
    render(
      <CandidateList
        candidates={[candidate('/a'), candidate('/b')]}
        onClean={onClean}
        isCleaning={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clean all' }));
    expect(onClean).toHaveBeenCalledWith(['/a/file.mkv', '/b/file.mkv']);
  });

  it('select-all toggles every row', async () => {
    const user = userEvent.setup();
    render(
      <CandidateList
        candidates={[candidate('/a'), candidate('/b')]}
        onClean={vi.fn()}
        isCleaning={false}
      />,
    );

    await user.click(screen.getByLabelText('Select all'));
    expect(screen.getByText(/2 of 2 selected/)).toBeInTheDocument();
  });

  it('disables "Clean selected" when nothing is selected', () => {
    render(<CandidateList candidates={[candidate('/a')]} onClean={vi.fn()} isCleaning={false} />);
    expect(screen.getByRole('button', { name: 'Clean selected' })).toBeDisabled();
  });
});
