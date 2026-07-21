import { useMemo, useState } from 'react';
import type { CleanupCandidate } from '../api/types';
import { formatSize } from '../utils/format';
import { CandidateRow } from './CandidateRow';

interface Props {
  candidates: CleanupCandidate[];
  onClean: (files: string[]) => void;
  isCleaning: boolean;
}

/** Collect every file path belonging to the given candidates. */
const filesOf = (candidates: CleanupCandidate[]): string[] =>
  candidates.flatMap((c) => c.files.map((f) => f.path));

export function CandidateList({ candidates, onClean, isCleaning }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => selected.has(c.id)),
    [candidates, selected],
  );
  const reclaimable = useMemo(
    () => selectedCandidates.reduce((sum, c) => sum + c.totalSizeBytes, 0),
    [selectedCandidates],
  );

  const allSelected = candidates.length > 0 && selected.size === candidates.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));

  const cleanSelected = () => {
    if (selectedCandidates.length === 0) return;
    onClean(filesOf(selectedCandidates));
    setSelected(new Set());
  };

  const cleanAll = () => {
    onClean(filesOf(candidates));
    setSelected(new Set());
  };

  if (candidates.length === 0) {
    return <p className="empty">Nothing to clean — every download is still linked. 🎉</p>;
  }

  return (
    <div className="candidate-list">
      <div className="toolbar">
        <span className="toolbar__info">
          {selected.size} of {candidates.length} selected
          {reclaimable > 0 && ` · ${formatSize(reclaimable)} reclaimable`}
        </span>
        <div className="toolbar__actions">
          <button
            type="button"
            onClick={cleanSelected}
            disabled={isCleaning || selected.size === 0}
          >
            Clean selected
          </button>
          <button type="button" className="btn--danger" onClick={cleanAll} disabled={isCleaning}>
            {isCleaning ? 'Cleaning…' : 'Clean all'}
          </button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th className="cell--check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </th>
            <th>Torrent / file</th>
            <th className="cell--num">Size</th>
            <th className="cell--num">Age</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              selected={selected.has(candidate.id)}
              onToggle={toggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
