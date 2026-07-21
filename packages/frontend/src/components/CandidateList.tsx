import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { CleanupCandidate } from '@/api/types';
import { formatSize } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    return (
      <Card className="items-center justify-center py-16 text-center">
        <p className="text-4xl">🎉</p>
        <p className="text-muted-foreground">Nothing to clean — every download is still linked.</p>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <span className="text-muted-foreground text-sm">
          {selected.size} of {candidates.length} selected
          {reclaimable > 0 && ` · ${formatSize(reclaimable)} reclaimable`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cleanSelected}
            disabled={isCleaning || selected.size === 0}
          >
            <Trash2 /> Clean selected
          </Button>
          <Button variant="destructive" size="sm" onClick={cleanAll} disabled={isCleaning}>
            <Trash2 /> {isCleaning ? 'Cleaning…' : 'Clean all'}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
            </TableHead>
            <TableHead>Torrent / file</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              selected={selected.has(candidate.id)}
              onToggle={toggle}
            />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
