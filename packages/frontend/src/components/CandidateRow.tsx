import type { CleanupCandidate } from '@/api/types';
import { formatAge, formatSize } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';

interface Props {
  candidate: CleanupCandidate;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function CandidateRow({ candidate, selected, onToggle }: Props) {
  const primary = candidate.torrents[0];
  const title = primary?.name ?? candidate.files[0]?.path ?? candidate.id;

  return (
    <TableRow data-state={selected ? 'selected' : undefined}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(candidate.id)}
          aria-label={`Select ${title}`}
        />
      </TableCell>
      <TableCell className="max-w-0 whitespace-normal">
        <div className="flex flex-col gap-1.5">
          <span className="font-medium break-all" title={candidate.id}>
            {title}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {candidate.crossSeed && (
              <Badge variant="secondary" title="Matched by multiple torrents">
                cross-seed ×{candidate.torrents.length}
              </Badge>
            )}
            {candidate.torrents.length === 0 && (
              <Badge variant="destructive" title="No matching torrent — deleted from disk">
                orphan
              </Badge>
            )}
            {candidate.files.length > 1 && (
              <Badge variant="outline">{candidate.files.length} files</Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-right tabular-nums">
        {formatSize(candidate.totalSizeBytes)}
      </TableCell>
      <TableCell className="text-muted-foreground text-right tabular-nums">
        {formatAge(candidate.ageDays)}
      </TableCell>
    </TableRow>
  );
}
