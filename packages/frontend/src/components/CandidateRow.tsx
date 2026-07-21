import type { CleanupCandidate } from '../api/types';
import { formatAge, formatSize } from '../utils/format';

interface Props {
  candidate: CleanupCandidate;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function CandidateRow({ candidate, selected, onToggle }: Props) {
  const primary = candidate.torrents[0];
  const title = primary?.name ?? candidate.files[0]?.path ?? candidate.id;

  return (
    <tr className={selected ? 'row row--selected' : 'row'}>
      <td className="cell cell--check">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(candidate.id)}
          aria-label={`Select ${title}`}
        />
      </td>
      <td className="cell cell--name">
        <span className="name" title={candidate.id}>
          {title}
        </span>
        <span className="badges">
          {candidate.crossSeed && (
            <span className="badge badge--crossseed" title="Matched by multiple torrents">
              cross-seed ×{candidate.torrents.length}
            </span>
          )}
          {candidate.torrents.length === 0 && (
            <span className="badge badge--orphan" title="No matching torrent — deleted from disk">
              orphan
            </span>
          )}
          {candidate.files.length > 1 && (
            <span className="badge">{candidate.files.length} files</span>
          )}
        </span>
      </td>
      <td className="cell cell--num">{formatSize(candidate.totalSizeBytes)}</td>
      <td className="cell cell--num">{formatAge(candidate.ageDays)}</td>
    </tr>
  );
}
